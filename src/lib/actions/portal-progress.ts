"use server";

import { revalidatePath } from "next/cache";
import { requireClientAuth } from "@/lib/client-auth";
import {
    addClientBodyMeasurement,
    deleteClientBodyMeasurement,
    deleteClientProgressPhoto,
    getClientProgressPhotoSignedUrl,
    listClientBodyMeasurements,
    listClientProgressPhotos,
    uploadClientProgressPhoto,
    type BodyMeasurementInput,
} from "@/lib/services/progress.service";

export type { BodyMeasurementInput };

export async function addBodyMeasurement(input: BodyMeasurementInput) {
    const session = await requireClientAuth();
    const result = await addClientBodyMeasurement(session, input);
    revalidatePath("/portal/progress");
    revalidatePath("/portal");
    return result;
}

export async function getBodyMeasurements() {
    const session = await requireClientAuth();
    return listClientBodyMeasurements(session);
}

export async function deleteBodyMeasurement(id: number) {
    const session = await requireClientAuth();
    const result = await deleteClientBodyMeasurement(session, id);
    revalidatePath("/portal/progress");
    return result;
}

export async function uploadProgressPhoto(formData: FormData) {
    const session = await requireClientAuth();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "front";
    const date = (formData.get("date") as string) || new Date().toISOString().slice(0, 10);
    const note = formData.get("note") as string | null;

    if (!file) return { success: false, error: "Nessun file ricevuto" };

    const result = await uploadClientProgressPhoto(session, { file, type, date, note });
    if (!result.success) return result;

    revalidatePath("/portal/progress");
    return { success: true as const };
}

export async function getProgressPhotos() {
    const session = await requireClientAuth();
    return listClientProgressPhotos(session);
}

export async function getProgressPhotoSignedUrl(photoId: number) {
    const session = await requireClientAuth();
    return getClientProgressPhotoSignedUrl(session, photoId);
}

export async function deleteProgressPhoto(id: number) {
    const session = await requireClientAuth();
    const result = await deleteClientProgressPhoto(session, id);
    revalidatePath("/portal/progress");
    return result;
}
