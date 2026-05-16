import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getR2SignedUrl } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * GET /api/v1/me/chat/attachments?key=<r2_key>
 * Ritorna un URL firmato (GET) per scaricare/visualizzare l'allegato di
 * un messaggio della propria conversazione. Verifica che la key appartenga
 * al path standard `trainers/<trainer_id>/clients/<client_id>/chat/…`
 * del client autenticato.
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    if (!key) {
        return jsonError("missing_key", "Parametro 'key' richiesto", 400);
    }

    const expectedPrefix = `trainers/${auth.session.trainer_id}/clients/${auth.session.id}/chat/`;
    if (!key.startsWith(expectedPrefix)) {
        return jsonError("forbidden", "Allegato non accessibile", 403);
    }

    const signedUrl = await getR2SignedUrl(key);
    return jsonOk({ url: signedUrl, expires_in: 3600 });
}
