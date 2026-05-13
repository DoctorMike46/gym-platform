import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { questionnaire_assignments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
    generateQuestionnaireAnswerKey,
    getR2SignedUploadUrl,
} from "@/lib/r2";

export const runtime = "nodejs";

const ALLOWED_CONTENT_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
];

interface PresignBody {
    question_id?: string;
    filename?: string;
    content_type?: string;
}

/**
 * POST /api/v1/me/questionnaires/<assignmentId>/upload-presign
 * Genera URL PUT firmato per upload diretto a R2.
 * Body: { question_id, filename, content_type }
 * Risposta: { upload_url, r2_key, expires_in, headers }
 */
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

    // Verifica che l'assignment appartenga al cliente loggato e sia ancora pending
    const [assignment] = await db
        .select()
        .from(questionnaire_assignments)
        .where(
            and(
                eq(questionnaire_assignments.id, assignmentId),
                eq(questionnaire_assignments.client_id, auth.session.id)
            )
        )
        .limit(1);
    if (!assignment) {
        return jsonError("not_found", "Questionario non trovato", 404);
    }
    if (assignment.status !== "pending") {
        return jsonError(
            "not_pending",
            "Questionario già completato o scaduto",
            400
        );
    }

    let body: PresignBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    const questionId = body.question_id?.trim();
    const filename = body.filename?.trim();
    const contentType = body.content_type?.trim();
    if (!questionId) {
        return jsonError("missing_fields", "question_id richiesto", 400);
    }
    if (!filename) {
        return jsonError("missing_fields", "filename richiesto", 400);
    }
    if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
        return jsonError(
            "invalid_content_type",
            "Content-type non supportato (solo immagini)",
            400
        );
    }

    const key = generateQuestionnaireAnswerKey(
        auth.session.id,
        assignmentId,
        questionId,
        filename
    );
    const url = await getR2SignedUploadUrl({
        key,
        contentType,
        expiresIn: 600,
    });

    return jsonOk({
        upload_url: url,
        r2_key: key,
        expires_in: 600,
        method: "PUT",
        headers: { "Content-Type": contentType },
    });
}
