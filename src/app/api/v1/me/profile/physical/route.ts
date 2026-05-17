import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { updatePhysical, type UpdatePhysicalInput } from "@/lib/services/profile.service";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let body: UpdatePhysicalInput;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    try {
        await updatePhysical(auth.session, body);
    } catch (err) {
        const msg = err instanceof Error ? err.message : "update_failed";
        if (msg.startsWith("invalid_")) {
            return jsonError(msg, "Valore non valido", 400);
        }
        console.error("[profile/physical] update failed", { err });
        return jsonError("server_error", "Errore interno", 500);
    }

    return jsonOk({ updated: true });
}
