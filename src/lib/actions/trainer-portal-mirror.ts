"use server";

import { db } from "@/db";
import {
    clients,
    body_measurements,
    progress_photos,
    workout_logs,
    workout_exercise_logs,
    workout_template_exercises,
    workout_templates,
    exercises,
} from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { getAuthenticatedTrainer } from "@/lib/auth";
import { getR2SignedUrl } from "@/lib/r2";
import { revalidatePath } from "next/cache";

async function ensureTrainerOwnsClient(clientId: number) {
    const trainer = await getAuthenticatedTrainer();
    const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.trainer_id, trainer.id)))
        .limit(1);
    if (!client) throw new Error("Cliente non trovato");
    return trainer;
}

export async function getClientWorkoutLogs(clientId: number) {
    await ensureTrainerOwnsClient(clientId);
    return db
        .select()
        .from(workout_logs)
        .where(eq(workout_logs.client_id, clientId))
        .orderBy(desc(workout_logs.date_executed));
}

export async function getClientWorkoutLogDetail(workoutLogId: number) {
    const trainer = await getAuthenticatedTrainer();
    const [log] = await db
        .select()
        .from(workout_logs)
        .where(eq(workout_logs.id, workoutLogId))
        .limit(1);
    if (!log) throw new Error("Sessione non trovata");

    // verifica trainer-owner
    const [client] = await db
        .select({ trainer_id: clients.trainer_id, nome: clients.nome, cognome: clients.cognome })
        .from(clients)
        .where(eq(clients.id, log.client_id))
        .limit(1);
    if (!client || client.trainer_id !== trainer.id) throw new Error("Non autorizzato");

    return loadLogDetail(log, { nome: client.nome, cognome: client.cognome });
}

export async function setClientWorkoutLogNote(workoutLogId: number, note: string) {
    const trainer = await getAuthenticatedTrainer();
    const [log] = await db
        .select({ id: workout_logs.id, client_id: workout_logs.client_id })
        .from(workout_logs)
        .where(eq(workout_logs.id, workoutLogId))
        .limit(1);
    if (!log) throw new Error("Sessione non trovata");

    const [client] = await db
        .select({ trainer_id: clients.trainer_id })
        .from(clients)
        .where(eq(clients.id, log.client_id))
        .limit(1);
    if (!client || client.trainer_id !== trainer.id) throw new Error("Non autorizzato");

    const trimmed = note.trim();
    await db
        .update(workout_logs)
        .set({
            trainer_note: trimmed.length > 0 ? trimmed : null,
            trainer_note_updated_at: new Date(),
        })
        .where(eq(workout_logs.id, workoutLogId));

    revalidatePath(`/clients/${log.client_id}/diary/${workoutLogId}`);
    revalidatePath(`/portal/workouts/log/${workoutLogId}`);
    return { success: true };
}

async function loadLogDetail(
    log: typeof workout_logs.$inferSelect,
    client: { nome: string; cognome: string }
): Promise<import("@/lib/types/workout-log-detail").WorkoutLogDetail> {
    const template = log.template_id
        ? (await db
            .select({ id: workout_templates.id, nome_template: workout_templates.nome_template, split_settimanale: workout_templates.split_settimanale })
            .from(workout_templates)
            .where(eq(workout_templates.id, log.template_id))
            .limit(1))[0] ?? null
        : null;

    const rows = await db
        .select({
            exerciseLog: workout_exercise_logs,
            templateExercise: workout_template_exercises,
            exercise: {
                id: exercises.id,
                nome: exercises.nome,
                gruppo_muscolare: exercises.gruppo_muscolare,
            },
        })
        .from(workout_exercise_logs)
        .leftJoin(
            workout_template_exercises,
            eq(workout_template_exercises.id, workout_exercise_logs.template_exercise_id)
        )
        .leftJoin(exercises, eq(exercises.id, workout_template_exercises.exercise_id))
        .where(eq(workout_exercise_logs.workout_log_id, log.id))
        .orderBy(asc(workout_exercise_logs.ordine));

    return { log, template, client, exerciseLogs: rows };
}

export async function getClientMeasurements(clientId: number) {
    await ensureTrainerOwnsClient(clientId);
    return db
        .select()
        .from(body_measurements)
        .where(eq(body_measurements.client_id, clientId))
        .orderBy(desc(body_measurements.date));
}

export async function getClientProgressPhotos(clientId: number) {
    await ensureTrainerOwnsClient(clientId);
    return db
        .select()
        .from(progress_photos)
        .where(eq(progress_photos.client_id, clientId))
        .orderBy(desc(progress_photos.date));
}

export async function getClientProgressPhotoUrl(photoId: number) {
    const trainer = await getAuthenticatedTrainer();
    const [photo] = await db
        .select()
        .from(progress_photos)
        .where(eq(progress_photos.id, photoId))
        .limit(1);
    if (!photo) throw new Error("Foto non trovata");

    const [client] = await db
        .select({ trainer_id: clients.trainer_id })
        .from(clients)
        .where(eq(clients.id, photo.client_id))
        .limit(1);
    if (!client || client.trainer_id !== trainer.id) throw new Error("Non autorizzato");

    return getR2SignedUrl(photo.r2_key);
}
