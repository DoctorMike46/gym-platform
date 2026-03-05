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
            }
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
