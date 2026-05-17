import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    deleteInjury,
    updateInjury,
    type UpdateInjuryInput,
} from "@/lib/services/injuries.service";

export const runtime = "nodejs";

function parseId(idStr: string): number | null {
    const id = Number(idStr);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { id: idStr } = await ctx.params;
    const id = parseId(idStr);
    if (id === null) return jsonError("invalid_id", "ID infortunio non valido", 400);

    let body: UpdateInjuryInput;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    try {
        const injury = await updateInjury(
            id,
            auth.session.id,
            auth.session.trainer_id,
            body,
            { type: "client", id: auth.session.id }
        );
        return jsonOk({ injury });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "update_failed";
        if (msg === "injury_not_found") return jsonError(msg, "Infortunio non trovato", 404);
        if (msg.startsWith("invalid_")) return jsonError(msg, "Valore non valido", 400);
        console.error("[injuries] update failed", { err });
        return jsonError("server_error", "Errore interno", 500);
    }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { id: idStr } = await ctx.params;
    const id = parseId(idStr);
    if (id === null) return jsonError("invalid_id", "ID infortunio non valido", 400);

    try {
        await deleteInjury(id, auth.session.id, auth.session.trainer_id, {
            type: "client",
            id: auth.session.id,
        });
        return jsonOk({ deleted: true });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "delete_failed";
        if (msg === "injury_not_found") return jsonError(msg, "Infortunio non trovato", 404);
        console.error("[injuries] delete failed", { err });
        return jsonError("server_error", "Errore interno", 500);
    }
}
