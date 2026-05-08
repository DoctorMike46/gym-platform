"use server";

import { revalidatePath } from "next/cache";
import { requireClientAuth } from "@/lib/client-auth";
import {
    getClientProfile,
    updateClientProfile,
    changeClientPassword,
    getClientActiveSubscription,
} from "@/lib/services/profile.service";

export async function getMyProfile() {
    const session = await requireClientAuth();
    return getClientProfile(session);
}

export async function updateMyProfile(input: { telefono?: string }) {
    const session = await requireClientAuth();
    const result = await updateClientProfile(session, { telefono: input.telefono ?? null });
    revalidatePath("/portal/profile");
    return result;
}

export async function changeMyPassword(currentPassword: string, newPassword: string) {
    const session = await requireClientAuth();
    return changeClientPassword(session, currentPassword, newPassword);
}

export async function getMyActiveSubscription() {
    const session = await requireClientAuth();
    return getClientActiveSubscription(session);
}
