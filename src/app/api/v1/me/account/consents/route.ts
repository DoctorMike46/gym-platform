import { NextRequest } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { updateClientConsents } from "@/lib/services/account-gdpr.service";

export const runtime = "nodejs";

/**
 * GET /api/v1/me/account/consents
 *   → Stato attuale dei consensi (timestamp di concessione, null = non
 *     concesso / revocato).
 *
 * PATCH /api/v1/me/account/consents
 *   Body: { marketing?: boolean }
 *   → Aggiorna i consensi opzionali. Privacy e Health non sono
 *     modificabili da qui (la revoca = cancellazione account).
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if ("session" in auth === false) return auth;

    const [row] = await db
        .select({
            privacy_accepted_at: clients.privacy_accepted_at,
            terms_accepted_at: clients.portal_terms_accepted_at,
            health_data_consent_at: clients.health_data_consent_at,
            marketing_consent_at: clients.marketing_consent_at,
        })
        .from(clients)
        .where(eq(clients.id, auth.session.id))
        .limit(1);

    if (!row) {
        return jsonError("not_found", "Profilo non trovato", 404);
    }

    return jsonOk({ consents: row });
}

export async function PATCH(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if ("session" in auth === false) return auth;

    let body: { marketing?: boolean };
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    await updateClientConsents(auth.session.id, {
        marketing: body.marketing,
    });

    const [row] = await db
        .select({
            privacy_accepted_at: clients.privacy_accepted_at,
            terms_accepted_at: clients.portal_terms_accepted_at,
            health_data_consent_at: clients.health_data_consent_at,
            marketing_consent_at: clients.marketing_consent_at,
        })
        .from(clients)
        .where(eq(clients.id, auth.session.id))
        .limit(1);

    return jsonOk({ consents: row });
}
