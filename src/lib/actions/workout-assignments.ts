"use server"

import { db } from "@/db";
import { client_workout_assignments, workout_templates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAllWorkoutTemplates() {
    try {
        return await db.select().from(workout_templates).orderBy(workout_templates.nome_template);
    } catch (error) {
        console.error("Errore recupero template:", error);
        return [];
    }
}

export async function assignWorkoutToClient(data: {
    client_id: number;
    template_id: number;
    note?: string;
}) {
    try {
        await db.insert(client_workout_assignments).values({
            client_id: data.client_id,
            template_id: data.template_id,
            note: data.note || null,
            attivo: true,
        });
        revalidatePath(`/clients/${data.client_id}`);
        return { success: true };
    } catch (error) {
        console.error("Errore assegnazione scheda:", error);
        return { success: false };
    }
}

export async function removeWorkoutFromClient(assignmentId: number, clientId: number) {
    try {
        await db.delete(client_workout_assignments)
            .where(eq(client_workout_assignments.id, assignmentId));
        revalidatePath(`/clients/${clientId}`);
        return { success: true };
    } catch (error) {
        console.error("Errore rimozione scheda:", error);
        return { success: false };
    }
}

export async function toggleWorkoutActive(assignmentId: number, attivo: boolean, clientId: number) {
    try {
        await db.update(client_workout_assignments)
            .set({ attivo })
            .where(eq(client_workout_assignments.id, assignmentId));
        revalidatePath(`/clients/${clientId}`);
        return { success: true };
    } catch (error) {
        console.error("Errore aggiornamento stato scheda:", error);
        return { success: false };
    }
}
