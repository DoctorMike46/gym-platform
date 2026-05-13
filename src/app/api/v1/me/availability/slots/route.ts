import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getAvailableSlots } from "@/lib/services/booking.service";

export const runtime = "nodejs";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/v1/me/availability/slots?from=YYYY-MM-DD&to=YYYY-MM-DD&duration_min=N
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const url = new URL(req.url);
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const durationStr = url.searchParams.get("duration_min") || "";
    const durationMin = parseInt(durationStr, 10);

    if (!ISO_DATE_RE.test(from) || !ISO_DATE_RE.test(to)) {
        return jsonError("invalid_range", "Range date YYYY-MM-DD richiesto", 400);
    }
    if (!Number.isFinite(durationMin) || durationMin < 5) {
        return jsonError("invalid_duration", "duration_min non valido", 400);
    }

    // Limita a 60 giorni per evitare query enormi
    const fromDate = new Date(from + "T00:00:00");
    const toDate = new Date(to + "T00:00:00");
    if ((toDate.getTime() - fromDate.getTime()) / 86_400_000 > 60) {
        return jsonError("range_too_wide", "Massimo 60 giorni", 400);
    }

    const days = await getAvailableSlots(auth.session, {
        fromIso: from,
        toIso: to,
        durationMin,
    });
    return jsonOk({ days });
}
