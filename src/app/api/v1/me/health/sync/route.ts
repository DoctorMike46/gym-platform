import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    insertHealthSamples,
    type IncomingSample,
} from "@/lib/services/health-samples.service";
import { logAudit } from "@/lib/audit-log";

export const runtime = "nodejs";

/**
 * POST /api/v1/me/health/sync
 * Body: { samples: [{ type, value, unit, recorded_at, source }, ...] }
 * Inserisce un batch di campioni di salute. I duplicati vengono ignorati.
 */
export async function POST(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let body: { samples?: IncomingSample[] };
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!Array.isArray(body.samples)) {
        return jsonError("invalid_body", "Campo 'samples' richiesto (array)", 400);
    }
    if (body.samples.length > 5000) {
        return jsonError(
            "too_many_samples",
            "Massimo 5000 campioni per richiesta",
            400,
        );
    }

    const result = await insertHealthSamples(auth.session.id, body.samples);

    await logAudit({
        actor: { type: "client", id: auth.session.id },
        action: "health.write",
        resourceType: "client_health_samples",
        clientId: auth.session.id,
        metadata: {
            received: body.samples.length,
            inserted: result.inserted,
        },
        request: req,
    });

    return jsonOk({ inserted: result.inserted, total_received: body.samples.length });
}
