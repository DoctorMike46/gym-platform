import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getExtendedProfile } from "@/lib/services/profile.service";

export const runtime = "nodejs";

/**
 * Profilo cliente esteso: dati fisici, obiettivi, preferenze nutrizionali,
 * lifestyle, storico medico (decifrato), infortuni, eventuale richiesta
 * piano alimentare attiva.
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const profile = await getExtendedProfile(auth.session);
    if (!profile) return jsonError("not_found", "Profilo non trovato", 404);

    return jsonOk({ profile });
}
