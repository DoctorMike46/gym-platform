import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    createBookingForClient,
    listClientAppointments,
} from "@/lib/services/booking.service";

export const runtime = "nodejs";

/** GET /api/v1/me/appointments?timeframe=upcoming|past|all */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const url = new URL(req.url);
    const tfRaw = url.searchParams.get("timeframe") ?? "upcoming";
    const tf: "upcoming" | "past" | "all" =
        tfRaw === "past" || tfRaw === "all" ? tfRaw : "upcoming";
    const rows = await listClientAppointments(auth.session, tf);
    return jsonOk({ appointments: rows });
}

interface CreateBody {
    appointment_type_id?: number;
    start_at?: string;
    cliente_note?: string;
    modalita?: "online" | "in_presenza";
}

/** POST /api/v1/me/appointments — crea prenotazione (status=pending) */
export async function POST(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let body: CreateBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }
    if (!body.appointment_type_id || !body.start_at) {
        return jsonError(
            "missing_fields",
            "appointment_type_id e start_at sono richiesti",
            400
        );
    }

    const result = await createBookingForClient(auth.session, {
        appointmentTypeId: body.appointment_type_id,
        startIso: body.start_at,
        clienteNote: body.cliente_note,
        modalitaOverride: body.modalita,
    });
    if (!result.ok) {
        return jsonError("booking_failed", result.error, 400);
    }
    return jsonOk({ appointment_id: result.appointmentId }, 201);
}
