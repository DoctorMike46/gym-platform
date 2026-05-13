import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { cancelBookingByClient } from "@/lib/services/booking.service";

export const runtime = "nodejs";

export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (!Number.isFinite(id)) {
        return jsonError("invalid_id", "ID non valido", 400);
    }
    const r = await cancelBookingByClient(auth.session, id);
    if (!r.ok) return jsonError("cancel_failed", r.error, 400);
    return jsonOk({ success: true });
}
