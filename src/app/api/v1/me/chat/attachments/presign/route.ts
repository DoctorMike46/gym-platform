import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { generateChatAttachmentKey, getR2SignedUploadUrl } from "@/lib/r2";

export const runtime = "nodejs";

interface PresignBody {
    filename?: string;
    content_type?: string;
    size_bytes?: number;
}

const ALLOWED_CONTENT_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
    "video/mp4",
    "video/quicktime",
];

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Genera URL PUT firmato per upload diretto a R2 di un allegato chat.
 * Il client poi chiamerà POST /api/v1/me/chat/messages con la r2_key per
 * registrare il messaggio con allegato.
 */
export async function POST(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let body: PresignBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!body.filename) {
        return jsonError("missing_filename", "filename richiesto", 400);
    }
    if (!body.content_type || !ALLOWED_CONTENT_TYPES.includes(body.content_type)) {
        return jsonError(
            "invalid_content_type",
            "Tipo di file non supportato (ammessi: immagini, PDF, video)",
            400,
        );
    }
    if (
        typeof body.size_bytes === "number" &&
        body.size_bytes > MAX_SIZE_BYTES
    ) {
        return jsonError(
            "file_too_large",
            "File troppo grande (max 25MB)",
            400,
        );
    }

    const key = generateChatAttachmentKey(
        auth.session.trainer_id,
        auth.session.id,
        body.filename,
    );
    const url = await getR2SignedUploadUrl({
        key,
        contentType: body.content_type,
        expiresIn: 600,
    });

    return jsonOk({
        upload_url: url,
        r2_key: key,
        expires_in: 600,
        method: "PUT",
        headers: { "Content-Type": body.content_type },
    });
}
