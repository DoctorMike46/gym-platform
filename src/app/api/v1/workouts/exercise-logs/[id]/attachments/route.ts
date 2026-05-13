import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    confirmAttachment,
    listClientExerciseLogAttachments,
} from "@/lib/services/workout-attachments.service";

export const runtime = "nodejs";

/**
 * GET — lista allegati di un exercise log (del cliente loggato).
 *
 * POST — registra una nuova r2_key (chiamato dopo l'upload PUT su R2).
 *   Body: { r2_key, mime_type, filename?, size_bytes?, duration_seconds? }
 */
export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { id } = await ctx.params;
    const exerciseLogId = Number(id);
    if (!Number.isFinite(exerciseLogId)) {
        return jsonError("invalid_id", "id non valido", 400);
    }

    const rows = await listClientExerciseLogAttachments(
        auth.session.id,
        exerciseLogId
    );
    return jsonOk({ attachments: rows });
}

interface PostBody {
    r2_key?: string;
    mime_type?: string;
    filename?: string;
    size_bytes?: number;
    duration_seconds?: number;
}

export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { id } = await ctx.params;
    const exerciseLogId = Number(id);
    if (!Number.isFinite(exerciseLogId)) {
        return jsonError("invalid_id", "id non valido", 400);
    }

    let body: PostBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!body.r2_key || !body.mime_type) {
        return jsonError(
            "missing_fields",
            "r2_key e mime_type richiesti",
            400
        );
    }

    try {
        const res = await confirmAttachment(auth.session, {
            exerciseLogId,
            r2Key: body.r2_key,
            mimeType: body.mime_type,
            filename: body.filename,
            sizeBytes: body.size_bytes,
            durationSeconds: body.duration_seconds,
        });
        return jsonOk({ attachment_id: res.id });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Errore";
        return jsonError("confirm_failed", message, 400);
    }
}
