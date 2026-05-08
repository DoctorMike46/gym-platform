import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getClientLastExerciseLogsBulk } from "@/lib/services/workouts.service";

export const runtime = "nodejs";

interface BulkBody {
    template_exercise_ids?: number[];
}

/**
 * Restituisce per ciascun template_exercise_id l'ultimo workout_exercise_log
 * "completed" del cliente (o null). Usato dal session player per pre-popolare
 * i campi reps/weight con i valori della sessione precedente.
 */
export async function POST(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let body: BulkBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    const ids = body.template_exercise_ids;
    if (!Array.isArray(ids) || ids.length === 0) {
        return jsonError(
            "missing_fields",
            "template_exercise_ids (array di numeri) richiesto",
            400
        );
    }
    if (ids.length > 50) {
        return jsonError("too_many", "Massimo 50 id per richiesta", 400);
    }
    if (!ids.every((n) => typeof n === "number" && Number.isFinite(n))) {
        return jsonError("invalid_id", "Tutti gli id devono essere numeri", 400);
    }

    const result = await getClientLastExerciseLogsBulk(auth.session, ids);
    return jsonOk({ logs: result });
}
