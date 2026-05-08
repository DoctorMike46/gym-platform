import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    addClientBodyMeasurement,
    listClientBodyMeasurements,
    type BodyMeasurementInput,
} from "@/lib/services/progress.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const measurements = await listClientBodyMeasurements(auth.session);
    return jsonOk({ measurements });
}

export async function POST(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let body: BodyMeasurementInput;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!body.date) {
        return jsonError("missing_fields", "date richiesto (YYYY-MM-DD)", 400);
    }

    await addClientBodyMeasurement(auth.session, body);
    return jsonOk({ success: true }, 201);
}
