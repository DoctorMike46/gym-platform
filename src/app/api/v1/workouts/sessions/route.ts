import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { startClientWorkoutSession } from "@/lib/services/workouts.service";

export const runtime = "nodejs";

interface StartBody {
    assignment_id?: number;
    giorno?: number;
    date?: string;
}

export async function POST(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let body: StartBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (
        typeof body.assignment_id !== "number" ||
        typeof body.giorno !== "number" ||
        typeof body.date !== "string"
    ) {
        return jsonError(
            "missing_fields",
            "assignment_id (number), giorno (number) e date (YYYY-MM-DD) richiesti",
            400
        );
    }

    try {
        const result = await startClientWorkoutSession(auth.session, {
            assignmentId: body.assignment_id,
            giorno: body.giorno,
            date: body.date,
        });
        return jsonOk({ workout_log_id: result.id }, 201);
    } catch {
        return jsonError("invalid_assignment", "Scheda non valida", 404);
    }
}
