import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    getMedicalHistory,
    upsertMedicalHistory,
    type UpsertMedicalInput,
} from "@/lib/services/medical.service";

export const runtime = "nodejs";

/**
 * Storico medico (GDPR art.9). Lettura decifrata + audit obbligatorio.
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const medical = await getMedicalHistory(auth.session.id, {
        type: "client",
        id: auth.session.id,
    });
    return jsonOk({ medical });
}

/**
 * Upsert dello storico medico. Richiede disclaimer la prima volta.
 */
export async function PATCH(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let body: UpsertMedicalInput;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    try {
        const medical = await upsertMedicalHistory(
            auth.session.id,
            auth.session.trainer_id,
            body,
            { type: "client", id: auth.session.id }
        );
        return jsonOk({ medical });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "update_failed";
        if (msg === "disclaimer_required") {
            return jsonError(
                "disclaimer_required",
                "Devi accettare il disclaimer GDPR per registrare dati sanitari",
                400
            );
        }
        console.error("[profile/medical] update failed", { err });
        return jsonError("server_error", "Errore interno", 500);
    }
}
