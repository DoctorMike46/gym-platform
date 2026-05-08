import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { deleteClientBodyMeasurement } from "@/lib/services/progress.service";

export const runtime = "nodejs";

export async function DELETE(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { id } = await ctx.params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
        return jsonError("invalid_id", "id non valido", 400);
    }

    await deleteClientBodyMeasurement(auth.session, numId);
    return jsonOk({ success: true });
}
