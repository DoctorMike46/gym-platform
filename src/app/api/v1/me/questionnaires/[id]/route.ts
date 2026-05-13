import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getQuestionnaireForClient } from "@/lib/services/questionnaires.service";

export const runtime = "nodejs";

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;
    const { id } = await ctx.params;
    const assignmentId = parseInt(id, 10);
    if (!Number.isFinite(assignmentId)) {
        return jsonError("invalid_id", "ID non valido", 400);
    }
    const detail = await getQuestionnaireForClient(auth.session, assignmentId);
    if (!detail) return jsonError("not_found", "Questionario non trovato", 404);
    return jsonOk({
        assignment: detail.assignment,
        template: detail.template,
        response: detail.response,
    });
}
