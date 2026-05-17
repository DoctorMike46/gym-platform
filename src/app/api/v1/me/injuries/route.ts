import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    createInjury,
    listInjuriesByClient,
    type CreateInjuryInput,
} from "@/lib/services/injuries.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const onlyActive = req.nextUrl.searchParams.get("only_active") === "1";
    const injuries = await listInjuriesByClient(
        auth.session.id,
        { type: "client", id: auth.session.id },
        { onlyActive }
    );
    return jsonOk({ injuries });
}

export async function POST(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let body: CreateInjuryInput;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    try {
        const injury = await createInjury(
            auth.session.id,
            auth.session.trainer_id,
            body,
            { type: "client", id: auth.session.id }
        );
        return jsonOk({ injury }, 201);
    } catch (err) {
        const msg = err instanceof Error ? err.message : "create_failed";
        if (msg.startsWith("invalid_")) {
            return jsonError(msg, "Valore non valido", 400);
        }
        console.error("[injuries] create failed", { err });
        return jsonError("server_error", "Errore interno", 500);
    }
}
