"use server";

import { db } from "@/db";
import {
    client_workout_assignments,
    workout_templates,
    workout_template_exercises,
    exercises,
    workout_logs,
    workout_exercise_logs,
    clients,
    trainers,
    settings,
} from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireClientAuth } from "@/lib/client-auth";
import { revalidatePath } from "next/cache";
import { sendClientLoggedWorkoutEmail } from "@/lib/email";

export async function getClientWorkouts() {
    const session = await requireClientAuth();
    const rows = await db
        .select({
            assignment: client_workout_assignments,
            template: workout_templates,
        })
        .from(client_workout_assignments)
        .leftJoin(workout_templates, eq(workout_templates.id, client_workout_assignments.template_id))
        .where(eq(client_workout_assignments.client_id, session.id))
        .orderBy(desc(client_workout_assignments.data_assegnazione));
    return rows;
}

export async function getClientWorkoutDetail(assignmentId: number) {
    const session = await requireClientAuth();
    const [assignment] = await db
        .select()
        .from(client_workout_assignments)
        .where(
            and(
                eq(client_workout_assignments.id, assignmentId),
                eq(client_workout_assignments.client_id, session.id)
            )
        )
        .limit(1);
    if (!assignment) throw new Error("Scheda non trovata");

    const [template] = await db
        .select()
        .from(workout_templates)
        .where(eq(workout_templates.id, assignment.template_id))
        .limit(1);
    if (!template) throw new Error("Template non trovato");

    const tplExercises = await db
        .select({
            te: workout_template_exercises,
            ex: exercises,
        })
        .from(workout_template_exercises)
        .leftJoin(exercises, eq(exercises.id, workout_template_exercises.exercise_id))
        .where(eq(workout_template_exercises.template_id, template.id))
        .orderBy(workout_template_exercises.giorno, workout_template_exercises.ordine);

    return { assignment, template, exercises: tplExercises };
}

export async function startWorkoutSession(params: {
    assignmentId: number;
    giorno: number;
    date: string; // YYYY-MM-DD
}) {
    const session = await requireClientAuth();
    const [assignment] = await db
        .select()
        .from(client_workout_assignments)
        .where(
            and(
                eq(client_workout_assignments.id, params.assignmentId),
                eq(client_workout_assignments.client_id, session.id)
            )
        )
        .limit(1);
    if (!assignment) throw new Error("Scheda non valida");

    // riusa la sessione in_progress dello stesso giorno se presente
    const [existing] = await db
        .select()
        .from(workout_logs)
        .where(
            and(
                eq(workout_logs.client_id, session.id),
                eq(workout_logs.assignment_id, params.assignmentId),
                eq(workout_logs.date_executed, params.date),
                eq(workout_logs.giorno, params.giorno),
                eq(workout_logs.status, "in_progress")
            )
        )
        .limit(1);

    if (existing) return { id: existing.id };

    const [created] = await db
        .insert(workout_logs)
        .values({
            client_id: session.id,
            assignment_id: params.assignmentId,
            template_id: assignment.template_id,
            giorno: params.giorno,
            date_executed: params.date,
            status: "in_progress",
        })
        .returning();
    return { id: created.id };
}

async function ensureLogOwnership(logId: number, clientId: number) {
    const [log] = await db
        .select()
        .from(workout_logs)
        .where(and(eq(workout_logs.id, logId), eq(workout_logs.client_id, clientId)))
        .limit(1);
    if (!log) throw new Error("Sessione non trovata");
    return log;
}

export async function saveExerciseLog(params: {
    workoutLogId: number;
    templateExerciseId: number;
    ordine: number;
    setsCompleted: number;
    repsActual: number[];
    weightActual: number[];
    rpeActual: (number | null)[];
    note?: string;
}) {
    const session = await requireClientAuth();
    await ensureLogOwnership(params.workoutLogId, session.id);

    const [existing] = await db
        .select()
        .from(workout_exercise_logs)
        .where(
            and(
                eq(workout_exercise_logs.workout_log_id, params.workoutLogId),
                eq(workout_exercise_logs.template_exercise_id, params.templateExerciseId)
            )
        )
        .limit(1);

    const data = {
        sets_completed: params.setsCompleted,
        reps_actual: params.repsActual,
        weight_actual: params.weightActual,
        rpe_actual: params.rpeActual,
        ordine: params.ordine,
        note: params.note,
    };

    if (existing) {
        await db
            .update(workout_exercise_logs)
            .set(data)
            .where(eq(workout_exercise_logs.id, existing.id));
    } else {
        await db.insert(workout_exercise_logs).values({
            workout_log_id: params.workoutLogId,
            template_exercise_id: params.templateExerciseId,
            ...data,
        });
    }

    await db
        .update(workout_logs)
        .set({ updated_at: new Date() })
        .where(eq(workout_logs.id, params.workoutLogId));

    return { success: true };
}

export async function finishWorkoutSession(workoutLogId: number, totalDurationSeconds: number) {
    const session = await requireClientAuth();
    const log = await ensureLogOwnership(workoutLogId, session.id);

    await db
        .update(workout_logs)
        .set({
            status: "completed",
            total_duration_seconds: totalDurationSeconds,
            updated_at: new Date(),
        })
        .where(eq(workout_logs.id, workoutLogId));

    // Notifica email al trainer (gated da setting)
    try {
        const [trainerSettings] = await db
            .select({
                notifications_workout_logs: settings.notifications_workout_logs,
                site_name: settings.site_name,
            })
            .from(settings)
            .where(eq(settings.trainer_id, session.trainer_id))
            .limit(1);

        if (trainerSettings?.notifications_workout_logs) {
            const [trainerRow] = await db
                .select({ email: trainers.email })
                .from(trainers)
                .where(eq(trainers.id, session.trainer_id))
                .limit(1);

            const [client] = await db
                .select({ nome: clients.nome, cognome: clients.cognome })
                .from(clients)
                .where(eq(clients.id, session.id))
                .limit(1);

            let workoutName = "Allenamento";
            if (log.template_id) {
                const [tpl] = await db
                    .select({ nome_template: workout_templates.nome_template })
                    .from(workout_templates)
                    .where(eq(workout_templates.id, log.template_id))
                    .limit(1);
                if (tpl) workoutName = tpl.nome_template;
            }

            if (trainerRow?.email && client) {
                await sendClientLoggedWorkoutEmail({
                    trainerEmail: trainerRow.email,
                    clientName: `${client.nome} ${client.cognome}`,
                    workoutName,
                    date: log.date_executed,
                    durationMinutes: Math.round(totalDurationSeconds / 60),
                    platformName: trainerSettings.site_name || "Ernesto Performance",
                });
            }
        }
    } catch (e) {
        console.warn("Notifica email allenamento fallita:", e);
    }

    revalidatePath("/portal");
    revalidatePath("/portal/workouts");
    return { success: true };
}

export async function getWorkoutLogHistory(assignmentId: number) {
    const session = await requireClientAuth();
    return db
        .select()
        .from(workout_logs)
        .where(
            and(
                eq(workout_logs.client_id, session.id),
                eq(workout_logs.assignment_id, assignmentId)
            )
        )
        .orderBy(desc(workout_logs.date_executed));
}

export async function getWorkoutLogWithExercises(
    logId: number
): Promise<import("@/lib/types/workout-log-detail").WorkoutLogDetail> {
    const session = await requireClientAuth();
    const log = await ensureLogOwnership(logId, session.id);

    const [client] = await db
        .select({ nome: clients.nome, cognome: clients.cognome })
        .from(clients)
        .where(eq(clients.id, session.id))
        .limit(1);

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
        .where(eq(workout_exercise_logs.workout_log_id, logId))
        .orderBy(asc(workout_exercise_logs.ordine));

    return {
        log,
        template,
        client: client ?? { nome: "", cognome: "" },
        exerciseLogs: rows,
    };
}
