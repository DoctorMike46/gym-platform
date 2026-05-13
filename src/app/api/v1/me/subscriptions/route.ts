import { NextRequest } from "next/server";
import { jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getClientSubscriptionsHistory } from "@/lib/services/profile.service";

export const runtime = "nodejs";

/**
 * Storico abbonamenti del cliente (ordine: data_inizio desc).
 * Per la sola subscription attiva resta canonico `GET /api/v1/me`.
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const rows = await getClientSubscriptionsHistory(auth.session);

    const items = rows.map((row) => ({
        id: row.sub.id,
        service_id: row.sub.service_id,
        data_inizio: row.sub.data_inizio,
        data_fine: row.sub.data_fine,
        status: row.sub.status,
        service: row.service
            ? {
                  nome_servizio: row.service.nome_servizio,
                  categoria: row.service.categoria,
                  prezzo: row.service.prezzo,
                  durata_settimane: row.service.durata_settimane,
              }
            : null,
    }));

    return jsonOk({ subscriptions: items });
}
