import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { generateProgressPhotoKey, getR2SignedUploadUrl } from "@/lib/r2";

export const runtime = "nodejs";

interface PresignBody {
    purpose?: "progress_photo";
    type?: string;
    filename?: string;
    content_type?: string;
}

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * Genera URL PUT firmato per upload diretto a R2 (foto progressi).
 * Il client poi chiamerà POST /api/v1/progress/photos con la r2_key per registrare la foto.
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

    if (body.purpose !== "progress_photo") {
        return jsonError("invalid_purpose", "purpose deve essere 'progress_photo'", 400);
    }
    if (!body.type || !["front", "side", "back"].includes(body.type)) {
        return jsonError("invalid_type", "type deve essere front, side o back", 400);
    }
    if (!body.content_type || !ALLOWED_CONTENT_TYPES.includes(body.content_type)) {
        return jsonError("invalid_content_type", "Content-type immagine non supportato", 400);
    }
    if (!body.filename) {
        return jsonError("missing_filename", "filename richiesto", 400);
    }

    const key = generateProgressPhotoKey(auth.session.id, body.type, body.filename);
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
