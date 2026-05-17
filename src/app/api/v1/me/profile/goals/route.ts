import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { updateGoals, type UpdateGoalsInput } from "@/lib/services/profile.service";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let body: UpdateGoalsInput;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    try {
        await updateGoals(auth.session, body);
    } catch (err) {
        console.error("[profile/goals] update failed", { err });
        return jsonError("server_error", "Errore interno", 500);
    }

    return jsonOk({ updated: true });
}
