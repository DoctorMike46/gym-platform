"use server";

import { db } from "@/db";
import { body_measurements, progress_photos } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireClientAuth } from "@/lib/client-auth";
import { uploadToR2, deleteFromR2, generateProgressPhotoKey, getR2SignedUrl } from "@/lib/r2";
import { revalidatePath } from "next/cache";

export interface BodyMeasurementInput {
    date: string;
    peso_kg?: string;
    body_fat_pct?: string;
    vita_cm?: string;
    fianchi_cm?: string;
    petto_cm?: string;
    braccio_cm?: string;
    coscia_cm?: string;
    note?: string;
}

export async function addBodyMeasurement(input: BodyMeasurementInput) {
    const session = await requireClientAuth();
    await db.insert(body_measurements).values({
        client_id: session.id,
        date: input.date,
        peso_kg: input.peso_kg || null,
        body_fat_pct: input.body_fat_pct || null,
        vita_cm: input.vita_cm || null,
        fianchi_cm: input.fianchi_cm || null,
        petto_cm: input.petto_cm || null,
        braccio_cm: input.braccio_cm || null,
        coscia_cm: input.coscia_cm || null,
        note: input.note || null,
    });
    revalidatePath("/portal/progress");
    revalidatePath("/portal");
    return { success: true };
}

export async function getBodyMeasurements() {
    const session = await requireClientAuth();
    return db
        .select()
        .from(body_measurements)
        .where(eq(body_measurements.client_id, session.id))
        .orderBy(desc(body_measurements.date));
}

export async function deleteBodyMeasurement(id: number) {
    const session = await requireClientAuth();
    await db
        .delete(body_measurements)
        .where(and(eq(body_measurements.id, id), eq(body_measurements.client_id, session.id)));
    revalidatePath("/portal/progress");
    return { success: true };
}

export async function uploadProgressPhoto(formData: FormData) {
    const session = await requireClientAuth();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "front";
    const date = (formData.get("date") as string) || new Date().toISOString().slice(0, 10);
    const note = formData.get("note") as string | null;

    if (!file) return { success: false, error: "Nessun file ricevuto" };

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) {
        return { success: false, error: "Tipo file non supportato" };
    }
    if (file.size > 10 * 1024 * 1024) {
        return { success: false, error: "File troppo grande (max 10MB)" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = generateProgressPhotoKey(session.id, type, file.name);

    await uploadToR2({ key, body: buffer, contentType: file.type });

    await db.insert(progress_photos).values({
        client_id: session.id,
        date,
        r2_key: key,
        type,
        note: note || null,
    });

    revalidatePath("/portal/progress");
    return { success: true };
}

export async function getProgressPhotos() {
    const session = await requireClientAuth();
    return db
        .select()
        .from(progress_photos)
        .where(eq(progress_photos.client_id, session.id))
        .orderBy(desc(progress_photos.date));
}

export async function getProgressPhotoSignedUrl(photoId: number) {
    const session = await requireClientAuth();
    const [photo] = await db
        .select()
        .from(progress_photos)
        .where(and(eq(progress_photos.id, photoId), eq(progress_photos.client_id, session.id)))
        .limit(1);
    if (!photo) throw new Error("Foto non trovata");
    return getR2SignedUrl(photo.r2_key);
}

export async function deleteProgressPhoto(id: number) {
    const session = await requireClientAuth();
    const [photo] = await db
        .select()
        .from(progress_photos)
        .where(and(eq(progress_photos.id, id), eq(progress_photos.client_id, session.id)))
        .limit(1);
    if (!photo) return { success: false, error: "Foto non trovata" };

    try {
        await deleteFromR2(photo.r2_key);
    } catch (e) {
        console.error("Errore delete R2 (proseguo):", e);
    }
    await db.delete(progress_photos).where(eq(progress_photos.id, id));
    revalidatePath("/portal/progress");
    return { success: true };
}
