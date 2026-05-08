import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    deleteClientProgressPhoto,
    getClientProgressPhotoSignedUrl,
} from "@/lib/services/progress.service";

export const runtime = "nodejs";

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { id } = await ctx.params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
        return jsonError("invalid_id", "id non valido", 400);
    }

    try {
        const url = await getClientProgressPhotoSignedUrl(auth.session, numId);
        return jsonOk({ url, expires_in: 3600 });
    } catch {
        return jsonError("not_found", "Foto non trovata", 404);
    }
}

export async function DELETE(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { id } = await ctx.params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
        return jsonError("invalid_id", "id non valido", 400);
    }

    const result = await deleteClientProgressPhoto(auth.session, numId);
    if (!result.success) {
        return jsonError("not_found", result.error, 404);
    }
    return jsonOk({ success: true });
}
