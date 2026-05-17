import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    getLifestyle,
    upsertLifestyle,
    type UpsertLifestyleInput,
} from "@/lib/services/lifestyle.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const lifestyle = await getLifestyle(auth.session.id, {
        type: "client",
        id: auth.session.id,
    });
    return jsonOk({ lifestyle });
}

export async function PATCH(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let body: UpsertLifestyleInput;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    try {
        const lifestyle = await upsertLifestyle(
            auth.session.id,
            auth.session.trainer_id,
            body,
            { type: "client", id: auth.session.id }
        );
        return jsonOk({ lifestyle });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "update_failed";
        if (msg.startsWith("invalid_")) {
            return jsonError(msg, "Valore non valido", 400);
        }
        console.error("[profile/lifestyle] update failed", { err });
        return jsonError("server_error", "Errore interno", 500);
    }
}
