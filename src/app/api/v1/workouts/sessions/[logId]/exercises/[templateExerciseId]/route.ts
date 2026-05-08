import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { saveClientExerciseLog } from "@/lib/services/workouts.service";

export const runtime = "nodejs";

interface ExerciseLogBody {
    ordine?: number;
    sets_completed?: number;
    reps_actual?: number[];
    weight_actual?: number[];
    rpe_actual?: (number | null)[];
    note?: string;
}

/**
 * Idempotente: autosave per esercizio in una sessione.
 */
export async function PUT(
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

    let body: ExerciseLogBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (
        typeof body.ordine !== "number" ||
        typeof body.sets_completed !== "number" ||
        !Array.isArray(body.reps_actual) ||
        !Array.isArray(body.weight_actual) ||
        !Array.isArray(body.rpe_actual)
    ) {
        return jsonError(
            "missing_fields",
            "ordine, sets_completed, reps_actual[], weight_actual[], rpe_actual[] richiesti",
            400
        );
    }

    try {
        const result = await saveClientExerciseLog(auth.session, {
            workoutLogId,
            templateExerciseId: tplExerciseId,
            ordine: body.ordine,
            setsCompleted: body.sets_completed,
            repsActual: body.reps_actual,
            weightActual: body.weight_actual,
            rpeActual: body.rpe_actual,
            note: body.note,
        });
        return jsonOk(result);
    } catch {
        return jsonError("not_found", "Sessione non trovata", 404);
    }
}
