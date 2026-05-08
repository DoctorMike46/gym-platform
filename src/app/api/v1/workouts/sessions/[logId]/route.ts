import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getClientWorkoutLogDetail } from "@/lib/services/workouts.service";

export const runtime = "nodejs";

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ logId: string }> }
) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { logId } = await ctx.params;
    const id = Number(logId);
    if (!Number.isFinite(id)) {
        return jsonError("invalid_id", "logId non valido", 400);
    }

    try {
        const detail = await getClientWorkoutLogDetail(auth.session, id);
        return jsonOk(detail);
    } catch {
        return jsonError("not_found", "Sessione non trovata", 404);
    }
}
