import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { createAttachmentPresign } from "@/lib/services/workout-attachments.service";

export const runtime = "nodejs";

/**
 * POST — chiede un signed PUT URL per uploadare direttamente a R2 un
 * allegato (foto/video) associato all'exercise_log indicato.
 *
 * Body: { filename, content_type, size_bytes? }
 * Risposta: { upload_url, r2_key, headers, kind, expires_in }
 *
 * Dopo l'upload PUT su R2 con i header restituiti, il client deve
 * confermare via POST .../attachments con r2_key+mime_type.
 */
interface PresignBody {
    filename?: string;
    content_type?: string;
    size_bytes?: number;
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

    let body: PresignBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!body.filename || !body.content_type) {
        return jsonError(
            "missing_fields",
            "filename e content_type richiesti",
            400
        );
    }

    try {
        const presign = await createAttachmentPresign(auth.session, {
            exerciseLogId,
            filename: body.filename,
            contentType: body.content_type,
            sizeBytes: body.size_bytes,
        });
        return jsonOk(presign);
    } catch (e) {
        const message = e instanceof Error ? e.message : "Errore";
        return jsonError("presign_failed", message, 400);
    }
}
