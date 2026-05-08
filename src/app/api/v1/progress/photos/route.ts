import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    listClientProgressPhotos,
    registerClientProgressPhoto,
} from "@/lib/services/progress.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const photos = await listClientProgressPhotos(auth.session);
    return jsonOk({ photos });
}

interface RegisterBody {
    r2_key?: string;
    type?: string;
    date?: string;
    note?: string | null;
}

/**
 * Registra una foto già caricata su R2 (via presign URL).
 * Il flow è: client chiede presign → PUT diretto a R2 → POST qui con la r2_key.
 */
export async function POST(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let body: RegisterBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!body.r2_key || !body.type || !body.date) {
        return jsonError("missing_fields", "r2_key, type, date richiesti", 400);
    }
    if (!["front", "side", "back"].includes(body.type)) {
        return jsonError("invalid_type", "type deve essere front, side o back", 400);
    }

    const result = await registerClientProgressPhoto(auth.session, {
        r2_key: body.r2_key,
        type: body.type,
        date: body.date,
        note: body.note,
    });
    return jsonOk(result, 201);
}
