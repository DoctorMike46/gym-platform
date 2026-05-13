import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { submitQuestionnaireForClient, type QuestionnaireAnswers } from "@/lib/services/questionnaires.service";

export const runtime = "nodejs";

interface SubmitBody {
    answers?: QuestionnaireAnswers;
}

export async function POST(
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

    let body: SubmitBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }
    if (!body.answers || typeof body.answers !== "object") {
        return jsonError("missing_answers", "Campo 'answers' richiesto", 400);
    }

    const r = await submitQuestionnaireForClient(
        auth.session,
        assignmentId,
        body.answers
    );
    if (!r.ok) return jsonError("submit_failed", r.error, 400);
    return jsonOk({ success: true });
}
