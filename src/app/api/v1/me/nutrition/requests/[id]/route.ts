import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getRequestById } from "@/lib/services/nutrition-requests.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
        return jsonError("invalid_id", "ID richiesta non valido", 400);
    }

    const request = await getRequestById(
        id,
        { type: "client", id: auth.session.id },
        { clientId: auth.session.id }
    );
    if (!request) return jsonError("not_found", "Richiesta non trovata", 404);

    return jsonOk({ request });
}
