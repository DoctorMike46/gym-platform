"use server"

import { db } from "@/db";
import { exercises } from "@/db/schema";
import { revalidatePath } from "next/cache";

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

        // Gestione istruzioni a step (semplificata per ora)
        const istruzioni = {
            setup: formData.get("setup") as string,
            esecuzione: formData.get("esecuzione") as string,
            focus: formData.get("focus") as string,
        }

        if (!nome) {
            console.error("Nome esercizio obbligatorio");
            return;
        }

        await db.insert(exercises).values({
            nome,
            gruppo_muscolare,
            descrizione,
            istruzioni_step_by_step: istruzioni,
        });

        revalidatePath("/exercises");
    } catch (error) {
        console.error("Errore creazione esercizio:", error);
    }
}
