import { NextRequest } from "next/server";
import { db } from "@/db";
import { workout_exercise_logs, workout_logs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * POST — risolve (e crea se assente) la riga workout_exercise_logs per la
 * coppia (workout_log_id, template_exercise_id). Necessario per il flusso
 * "Aggiungi allegato durante la sessione" prima che ci sia stato un primo
 * save delle serie. Restituisce l'exercise_log_id.
 *
 * Body opzionale: { ordine?: number }
 */
interface Body {
    ordine?: number;
}

export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ logId: string; templateExerciseId: string }> }
) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { logId, templateExerciseId } = await ctx.params;
    const workoutLogId = Number(logId);
    const tplExerciseId = Number(templateExerciseId);
    if (!Number.isFinite(workoutLogId) || !Number.isFinite(tplExerciseId)) {
        return jsonError("invalid_id", "id non validi", 400);
    }

    let body: Body = {};
    try {
        body = await req.json();
    } catch {
        // body opzionale
    }

    // Ownership check
    const [log] = await db
        .select({ id: workout_logs.id })
        .from(workout_logs)
        .where(
            and(
                eq(workout_logs.id, workoutLogId),
                eq(workout_logs.client_id, auth.session.id)
            )
        )
        .limit(1);
    if (!log) {
        return jsonError("not_found", "Sessione non trovata", 404);
    }

    // Esiste già?
    const [existing] = await db
        .select({ id: workout_exercise_logs.id })
        .from(workout_exercise_logs)
        .where(
            and(
                eq(workout_exercise_logs.workout_log_id, workoutLogId),
                eq(workout_exercise_logs.template_exercise_id, tplExerciseId)
            )
        )
        .limit(1);

    if (existing) {
        return jsonOk({ exercise_log_id: existing.id, created: false });
    }

    const [created] = await db
        .insert(workout_exercise_logs)
        .values({
            workout_log_id: workoutLogId,
            template_exercise_id: tplExerciseId,
            ordine: body.ordine ?? 0,
            sets_completed: 0,
            reps_actual: [],
            weight_actual: [],
            rpe_actual: [],
        })
        .returning({ id: workout_exercise_logs.id });

    return jsonOk({ exercise_log_id: created.id, created: true });
}
