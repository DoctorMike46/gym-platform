import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getClientDocumentDownloadUrl } from "@/lib/services/documents.service";

export const runtime = "nodejs";

/**
 * Restituisce un signed URL per il download del documento.
 * Default: redirect 302 (utile da browser/mobile webview).
 * Aggiungere ?json=1 per ricevere il JSON con la URL.
 */
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

    let url: string;
    try {
        url = await getClientDocumentDownloadUrl(auth.session, numId);
    } catch {
        return jsonError("not_found", "Documento non trovato", 404);
    }

    const wantsJson = new URL(req.url).searchParams.get("json") === "1";
    if (wantsJson) {
        return jsonOk({ url, expires_in: 3600 });
    }

    return NextResponse.redirect(url, 302);
}
