import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { finishClientWorkoutSession } from "@/lib/services/workouts.service";

export const runtime = "nodejs";

interface FinishBody {
    total_duration_seconds?: number;
    note?: string | null;
}

export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ logId: string }> }
) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { logId } = await ctx.params;
    const workoutLogId = Number(logId);
    if (!Number.isFinite(workoutLogId)) {
        return jsonError("invalid_id", "logId non valido", 400);
    }

    let body: FinishBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (typeof body.total_duration_seconds !== "number") {
        return jsonError("missing_fields", "total_duration_seconds richiesto", 400);
    }

    try {
        const result = await finishClientWorkoutSession(
            auth.session,
            workoutLogId,
            body.total_duration_seconds,
            { note: body.note ?? null }
        );
        return jsonOk(result);
    } catch {
        return jsonError("not_found", "Sessione non trovata", 404);
    }
}
