import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { listClientWorkoutLogHistory } from "@/lib/services/workouts.service";

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

    const logs = await listClientWorkoutLogHistory(auth.session, assignmentId);
    return jsonOk({ logs });
}
