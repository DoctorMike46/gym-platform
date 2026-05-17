"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedTrainer } from "@/lib/auth";
import {
    countPendingRequestsForTrainer,
    declineRequest,
    getRequestById,
    listRequestsForTrainer,
    markRequestInReview,
} from "@/lib/services/nutrition-requests.service";
import type {
    ListRequestsFilters,
    NutritionRequestStatus,
} from "@/lib/services/nutrition-requests.types";

export async function listNutritionRequests(filters: {
    status?: NutritionRequestStatus;
    clientId?: number;
    from?: string;
    to?: string;
} = {}) {
    const trainer = await getAuthenticatedTrainer();
    const parsed: ListRequestsFilters = {
        status: filters.status,
        clientId: filters.clientId,
        fromDate: filters.from ? new Date(filters.from) : undefined,
        toDate: filters.to ? new Date(filters.to) : undefined,
    };
    return listRequestsForTrainer(trainer.id, parsed);
}

export async function countNutritionRequestsPending() {
    const trainer = await getAuthenticatedTrainer();
    return countPendingRequestsForTrainer(trainer.id);
}

export async function getNutritionRequestDetail(id: number) {
    const trainer = await getAuthenticatedTrainer();
    const request = await getRequestById(
        id,
        { type: "trainer", id: trainer.id },
        { trainerId: trainer.id }
    );
    if (!request) return { success: false as const, error: "not_found" };
    return { success: true as const, request };
}

export async function markNutritionRequestInReview(id: number, note: string | null = null) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const request = await markRequestInReview(id, trainer.id, note, {
            type: "trainer",
            id: trainer.id,
        });
        revalidatePath("/nutrition");
        return { success: true as const, request };
    } catch (err) {
        const msg = err instanceof Error ? err.message : "update_failed";
        return { success: false as const, error: msg };
    }
}

export async function declineNutritionRequest(id: number, reason: string) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const request = await declineRequest(id, trainer.id, reason, {
            type: "trainer",
            id: trainer.id,
        });
        revalidatePath("/nutrition");
        return { success: true as const, request };
    } catch (err) {
        const msg = err instanceof Error ? err.message : "decline_failed";
        return { success: false as const, error: msg };
    }
}
