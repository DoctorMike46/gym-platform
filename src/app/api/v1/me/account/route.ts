import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { deleteClientAccount } from "@/lib/services/account-gdpr.service";

export const runtime = "nodejs";

/**
 * DELETE /api/v1/me/account
 *
 * Cancella in modo definitivo l'account del cliente e tutti i dati
 * personali collegati (art. 17 GDPR — "diritto all'oblio").
 *
 * Body: { password: string, confirm: string }
 *  - password: la password corrente (riconferma)
 *  - confirm: deve essere la stringa "ELIMINA" come safety guard
 *
 * Risposta: 200 OK con statistiche, dopodiché tutti i token correnti
 * diventano invalidi (la riga clients è eliminata).
 */
export async function DELETE(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if ("session" in auth === false) return auth;

    let body: { password?: string; confirm?: string };
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (body.confirm !== "ELIMINA") {
        return jsonError(
            "confirm_required",
            "Conferma mancante. Inviare confirm=\"ELIMINA\".",
            400
        );
    }

    if (!body.password || body.password.length < 1) {
        return jsonError("password_required", "Password richiesta", 400);
    }

    const [client] = await db
        .select({
            id: clients.id,
            password_hash: clients.password_hash,
        })
        .from(clients)
        .where(eq(clients.id, auth.session.id))
        .limit(1);

    if (!client || !client.password_hash) {
        return jsonError("not_found", "Cliente non trovato", 404);
    }

    const ok = await bcrypt.compare(body.password, client.password_hash);
    if (!ok) {
        return jsonError("invalid_password", "Password non corretta", 401);
    }

    try {
        const result = await deleteClientAccount(auth.session.id);
        return jsonOk({
            deleted: true,
            r2_objects_deleted: result.deleted_objects,
            r2_objects_failed: result.failed_objects,
        });
    } catch (e) {
        console.error("[me/account] delete failed", e);
        return jsonError(
            "delete_failed",
            "Errore durante la cancellazione. Riprova o contatta il supporto.",
            500
        );
    }
}
