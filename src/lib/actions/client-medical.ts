"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedTrainer } from "@/lib/auth";
import {
    getMedicalHistory,
    upsertMedicalHistory,
    type UpsertMedicalInput,
} from "@/lib/services/medical.service";

/**
 * Lettura storico medico cliente (GDPR art.9). Audita ogni accesso.
 */
export async function getClientMedicalHistory(clientId: number) {
    const trainer = await getAuthenticatedTrainer();
    return getMedicalHistory(clientId, { type: "trainer", id: trainer.id });
}

/**
 * Upsert. Il trainer può modificare lo storico medico — accept_disclaimer=true
 * obbligatorio se non c'è ancora un consenso.
 */
export async function updateClientMedicalHistory(
    clientId: number,
    input: UpsertMedicalInput
) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const medical = await upsertMedicalHistory(
            clientId,
            trainer.id,
            input,
            { type: "trainer", id: trainer.id }
        );
        revalidatePath(`/clients/${clientId}`);
        return { success: true as const, medical };
    } catch (err) {
        return {
            success: false as const,
            error: err instanceof Error ? err.message : "update_failed",
        };
    }
}
