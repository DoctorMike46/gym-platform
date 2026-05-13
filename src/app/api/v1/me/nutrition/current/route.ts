import { NextRequest } from "next/server";
import { jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getActiveMealPlanForClient } from "@/lib/services/nutrition.service";

export const runtime = "nodejs";

/**
 * Piano alimentare attivo del cliente loggato, con pasti
 * raggruppati lato client per giorno_settimana e momento.
 * Risponde { data: { plan: null } } se non c'è alcun piano attivo.
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const plan = await getActiveMealPlanForClient(auth.session);
    return jsonOk({ plan });
}
