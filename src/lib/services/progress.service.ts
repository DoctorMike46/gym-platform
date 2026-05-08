import { db } from "@/db";
import { body_measurements, progress_photos } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import {
    deleteFromR2,
    generateProgressPhotoKey,
    getR2SignedUrl,
    uploadToR2,
} from "@/lib/r2";
import type { ClientSession } from "@/lib/client-auth";

export interface BodyMeasurementInput {
    date: string;
    peso_kg?: string | null;
    body_fat_pct?: string | null;
    vita_cm?: string | null;
    fianchi_cm?: string | null;
    petto_cm?: string | null;
    braccio_cm?: string | null;
    coscia_cm?: string | null;
    note?: string | null;
}

export async function addClientBodyMeasurement(
    session: ClientSession,
    input: BodyMeasurementInput
) {
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
    return { success: true as const };
}

export async function listClientBodyMeasurements(session: ClientSession) {
    return db
        .select()
        .from(body_measurements)
        .where(eq(body_measurements.client_id, session.id))
        .orderBy(desc(body_measurements.date));
}

export async function deleteClientBodyMeasurement(
    session: ClientSession,
    id: number
) {
    await db
        .delete(body_measurements)
        .where(
            and(eq(body_measurements.id, id), eq(body_measurements.client_id, session.id))
        );
    return { success: true as const };
}

export interface UploadProgressPhotoInput {
    file: File;
    type: string;
    date: string;
    note?: string | null;
}

export type UploadProgressPhotoResult =
    | { success: true; key: string; photoId: number }
    | { success: false; error: string };

const ALLOWED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

export async function uploadClientProgressPhoto(
    session: ClientSession,
    input: UploadProgressPhotoInput
): Promise<UploadProgressPhotoResult> {
    if (!input.file) return { success: false, error: "Nessun file ricevuto" };
    if (!ALLOWED_PHOTO_TYPES.includes(input.file.type)) {
        return { success: false, error: "Tipo file non supportato" };
    }
    if (input.file.size > MAX_PHOTO_SIZE_BYTES) {
        return { success: false, error: "File troppo grande (max 10MB)" };
    }

    const buffer = Buffer.from(await input.file.arrayBuffer());
    const key = generateProgressPhotoKey(session.id, input.type, input.file.name);
    await uploadToR2({ key, body: buffer, contentType: input.file.type });

    const [created] = await db
        .insert(progress_photos)
        .values({
            client_id: session.id,
            date: input.date,
            r2_key: key,
            type: input.type,
            note: input.note || null,
        })
        .returning();

    return { success: true, key, photoId: created.id };
}

/**
 * Variante per upload "diretto" (mobile via presign URL): la foto è già su R2,
 * registriamo solo la riga DB.
 */
export async function registerClientProgressPhoto(
    session: ClientSession,
    input: { r2_key: string; type: string; date: string; note?: string | null }
) {
    const [created] = await db
        .insert(progress_photos)
        .values({
            client_id: session.id,
            date: input.date,
            r2_key: input.r2_key,
            type: input.type,
            note: input.note || null,
        })
        .returning();
    return { success: true as const, photoId: created.id };
}

export async function listClientProgressPhotos(session: ClientSession) {
    return db
        .select()
        .from(progress_photos)
        .where(eq(progress_photos.client_id, session.id))
        .orderBy(desc(progress_photos.date));
}

export async function getClientProgressPhotoSignedUrl(
    session: ClientSession,
    photoId: number
): Promise<string> {
    const [photo] = await db
        .select()
        .from(progress_photos)
        .where(
            and(eq(progress_photos.id, photoId), eq(progress_photos.client_id, session.id))
        )
        .limit(1);
    if (!photo) throw new Error("Foto non trovata");
    return getR2SignedUrl(photo.r2_key);
}

export async function deleteClientProgressPhoto(
    session: ClientSession,
    id: number
): Promise<{ success: true } | { success: false; error: string }> {
    const [photo] = await db
        .select()
        .from(progress_photos)
        .where(
            and(eq(progress_photos.id, id), eq(progress_photos.client_id, session.id))
        )
        .limit(1);
    if (!photo) return { success: false, error: "Foto non trovata" };

    try {
        await deleteFromR2(photo.r2_key);
    } catch (e) {
        console.error("Errore delete R2 (proseguo):", e);
    }
    await db.delete(progress_photos).where(eq(progress_photos.id, id));
    return { success: true };
}
