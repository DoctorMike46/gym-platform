import { NextRequest } from "next/server";
import { jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { listAppointmentTypesForClient } from "@/lib/services/booking.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;
    const types = await listAppointmentTypesForClient(auth.session);
    return jsonOk({ appointment_types: types });
}
