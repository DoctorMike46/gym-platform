"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedTrainer } from "@/lib/auth";
import {
    createInjury,
    deleteInjury,
    listInjuriesByClient,
    updateInjury,
    type CreateInjuryInput,
    type UpdateInjuryInput,
} from "@/lib/services/injuries.service";

export async function listClientInjuries(clientId: number, onlyActive = false) {
    const trainer = await getAuthenticatedTrainer();
    return listInjuriesByClient(
        clientId,
        { type: "trainer", id: trainer.id },
        { onlyActive }
    );
}

export async function createClientInjury(clientId: number, input: CreateInjuryInput) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const injury = await createInjury(clientId, trainer.id, input, {
            type: "trainer",
            id: trainer.id,
        });
        revalidatePath(`/clients/${clientId}`);
        return { success: true as const, injury };
    } catch (err) {
        return {
            success: false as const,
            error: err instanceof Error ? err.message : "create_failed",
        };
    }
}

export async function updateClientInjury(
    injuryId: number,
    clientId: number,
    input: UpdateInjuryInput
) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const injury = await updateInjury(injuryId, clientId, trainer.id, input, {
            type: "trainer",
            id: trainer.id,
        });
        revalidatePath(`/clients/${clientId}`);
        return { success: true as const, injury };
    } catch (err) {
        return {
            success: false as const,
            error: err instanceof Error ? err.message : "update_failed",
        };
    }
}

export async function deleteClientInjury(injuryId: number, clientId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await deleteInjury(injuryId, clientId, trainer.id, {
            type: "trainer",
            id: trainer.id,
        });
        revalidatePath(`/clients/${clientId}`);
        return { success: true as const };
    } catch (err) {
        return {
            success: false as const,
            error: err instanceof Error ? err.message : "delete_failed",
        };
    }
}
