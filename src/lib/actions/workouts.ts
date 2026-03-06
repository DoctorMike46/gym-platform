"use server"

import { db } from "@/db";
import { workout_templates, workout_template_exercises, exercises } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export async function getWorkoutTemplates() {
    try {
        return await db.select().from(workout_templates).orderBy(workout_templates.created_at);
    } catch (error) {
        console.error("Errore nel recupero dei template:", error);
        return [];
    }
}

export async function getWorkoutTemplateWithExercises(templateId: number) {
    try {
        const template = await db.query.workout_templates.findFirst({
            where: eq(workout_templates.id, templateId),
        });

        const templateExercises = await db.query.workout_template_exercises.findMany({
            where: eq(workout_template_exercises.template_id, templateId),
            with: {
                exercise: true,
            },
            orderBy: (exercises, { asc }) => [asc(exercises.giorno), asc(exercises.ordine)],
        });

        return { ...template, exercises: templateExercises };
    } catch (error) {
        console.error("Errore nel recupero del template completo:", error);
        return null;
    }
}

export async function createWorkoutTemplate(data: {
    nome_template: string;
    split_settimanale: number;
    note_progressione?: string;
    exercises: {
        exercise_id: number;
        giorno: number;
        ordine: number;
        serie: string;
        ripetizioni: string;
        recupero: string;
        rpe?: string;
        note_tecniche?: string;
    }[];
}) {
    try {
        const [template] = await db.insert(workout_templates).values({
            nome_template: data.nome_template,
            split_settimanale: data.split_settimanale,
            note_progressione: data.note_progressione,
        }).returning();

        if (data.exercises && data.exercises.length > 0) {
            await db.insert(workout_template_exercises).values(
                data.exercises.map((ex) => ({
                    template_id: template.id,
                    exercise_id: ex.exercise_id,
                    giorno: ex.giorno,
                    ordine: ex.ordine,
                    serie: ex.serie,
                    ripetizioni: ex.ripetizioni,
                    recupero: ex.recupero,
                    rpe: ex.rpe,
                    note_tecniche: ex.note_tecniche,
                }))
            );
        }

        revalidatePath("/workouts");
        return { success: true, id: template.id };
    } catch (error) {
        console.error("Errore creazione template workout:", error);
        return { error: "Failed to create workout template." };
    }
}

export async function updateWorkoutTemplate(id: number, data: {
    nome_template: string;
    split_settimanale: number;
    note_progressione?: string;
    exercises: {
        exercise_id: number;
        giorno: number;
        ordine: number;
        serie: string;
        ripetizioni: string;
        recupero: string;
        rpe?: string;
        note_tecniche?: string;
    }[];
}) {
    try {
        await db.update(workout_templates).set({
            nome_template: data.nome_template,
            split_settimanale: data.split_settimanale,
            note_progressione: data.note_progressione,
            updated_at: new Date(),
        }).where(eq(workout_templates.id, id));

        // Delete vecchi esercizi e reinserisci (approccio rimpiazzo completo)
        await db.delete(workout_template_exercises)
            .where(eq(workout_template_exercises.template_id, id));

        if (data.exercises && data.exercises.length > 0) {
            await db.insert(workout_template_exercises).values(
                data.exercises.map((ex) => ({
                    template_id: id,
                    exercise_id: ex.exercise_id,
                    giorno: ex.giorno,
                    ordine: ex.ordine,
                    serie: ex.serie,
                    ripetizioni: ex.ripetizioni,
                    recupero: ex.recupero,
                    rpe: ex.rpe,
                    note_tecniche: ex.note_tecniche,
                }))
            );
        }

        revalidatePath("/workouts");
        return { success: true };
    } catch (error) {
        console.error("Errore aggiornamento template workout:", error);
        return { error: "Failed to update workout template." };
    }
}

export async function deleteWorkoutTemplate(id: number) {
    try {
        await db.delete(workout_templates).where(eq(workout_templates.id, id));
        revalidatePath("/workouts");
        return { success: true };
    } catch (error) {
        console.error("Errore eliminazione template:", error);
        return { success: false };
    }
}
