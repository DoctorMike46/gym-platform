"use server"

import { db } from "@/db";
import { exercises } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export async function getExercises() {
    try {
        const allExercises = await db.select().from(exercises);
        return allExercises;
    } catch (error) {
        console.error("Errore nel recupero esercizi:", error);
        return [];
    }
}

export async function createExercise(formData: FormData) {
    try {
        const nome = formData.get("nome") as string;
        const gruppo_muscolare = formData.get("gruppo_muscolare") as string;
        const descrizione = formData.get("descrizione") as string;
        const video_url = formData.get("video_url") as string;

        const stepsJson = formData.get("steps_json") as string;
        let istruzioni = [];
        try {
            if (stepsJson) istruzioni = JSON.parse(stepsJson);
        } catch (e) {
            console.error("Invalid JSON for steps:", e);
        }

        if (!nome) {
            console.error("Nome esercizio obbligatorio");
            return;
        }

        await db.insert(exercises).values({
            nome,
            gruppo_muscolare,
            video_url,
            descrizione,
            istruzioni_step_by_step: istruzioni,
        });

        revalidatePath("/exercises");
        return { success: true };
    } catch (error) {
        console.error("Errore creazione esercizio:", error);
        return { success: false };
    }
}

export async function updateExercise(id: number, formData: FormData) {
    try {
        const nome = formData.get("nome") as string;
        const gruppo_muscolare = formData.get("gruppo_muscolare") as string;
        const descrizione = formData.get("descrizione") as string;
        const video_url = formData.get("video_url") as string;

        const stepsJson = formData.get("steps_json") as string;
        let istruzioni = [];
        try {
            if (stepsJson) istruzioni = JSON.parse(stepsJson);
        } catch (e) {
            console.error("Invalid JSON for steps:", e);
        }

        if (!nome) return { success: false };

        await db.update(exercises).set({
            nome,
            gruppo_muscolare,
            video_url,
            descrizione,
            istruzioni_step_by_step: istruzioni,
        }).where(eq(exercises.id, id));

        revalidatePath("/exercises");
        return { success: true };
    } catch (error) {
        console.error("Errore modifica esercizio:", error);
        return { success: false };
    }
}

export async function deleteExercise(id: number) {
    try {
        await db.delete(exercises).where(eq(exercises.id, id));
        revalidatePath("/exercises");
        return { success: true };
    } catch (error) {
        console.error("Errore eliminazione esercizio:", error);
        return { success: false };
    }
}
