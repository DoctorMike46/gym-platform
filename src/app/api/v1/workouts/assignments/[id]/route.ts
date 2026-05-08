import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getClientWorkoutAssignmentDetail } from "@/lib/services/workouts.service";

export const runtime = "nodejs";

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { id } = await ctx.params;
    const assignmentId = Number(id);
    if (!Number.isFinite(assignmentId)) {
        return jsonError("invalid_id", "id non valido", 400);
    }

    try {
        const detail = await getClientWorkoutAssignmentDetail(auth.session, assignmentId);
        return jsonOk(detail);
    } catch {
        return jsonError("not_found", "Scheda non trovata", 404);
    }
}
