import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireApiClientAuth } from "@/lib/api-auth";
import { exportClientData } from "@/lib/services/account-gdpr.service";

export const runtime = "nodejs";

/**
 * GET /api/v1/me/account/export
 *
 * Restituisce un JSON con tutti i dati personali dell'utente.
 * Diritto alla portabilità (art. 20 GDPR).
 *
 * Headers: Authorization: Bearer <token>
 * Risposta: application/json con header Content-Disposition: attachment
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if ("session" in auth === false) return auth;

    try {
        const data = await exportClientData(auth.session.id);
        if (!data) {
            return jsonError("not_found", "Profilo non trovato", 404);
        }

        const today = new Date().toISOString().slice(0, 10);
        const filename = `dati-personali-${auth.session.id}-${today}.json`;

        return new NextResponse(JSON.stringify(data, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (e) {
        console.error("[me/account/export] failed", e);
        return jsonError(
            "export_failed",
            "Errore durante l'export dei dati. Riprova.",
            500
        );
    }
}
