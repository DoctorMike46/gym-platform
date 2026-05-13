import { NextRequest } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { jsonOk, requireApiClientAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * Lista pacchetti attivi del trainer del cliente loggato.
 * `caratteristiche` è una textarea grezza nel DB (righe separate da \n).
 * La normalizziamo qui in array per stabilizzare il contratto verso il mobile.
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const rows = await db
        .select({
            id: services.id,
            nome_servizio: services.nome_servizio,
            categoria: services.categoria,
            prezzo: services.prezzo,
            descrizione_breve: services.descrizione_breve,
            caratteristiche: services.caratteristiche,
            durata_settimane: services.durata_settimane,
            include_coaching: services.include_coaching,
        })
        .from(services)
        .where(
            and(
                eq(services.trainer_id, auth.session.trainer_id),
                eq(services.is_active, true)
            )
        )
        .orderBy(asc(services.prezzo));

    const items = rows.map((r) => ({
        ...r,
        caratteristiche: (r.caratteristiche ?? "")
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
    }));

    return jsonOk({ services: items });
}
