import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    getClientActiveSubscription,
    getClientProfile,
    getTrainerBranding,
    updateClientProfile,
} from "@/lib/services/profile.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if ("session" in auth === false) return auth;

    const [profile, branding, subscription] = await Promise.all([
        getClientProfile(auth.session),
        getTrainerBranding(auth.session),
        getClientActiveSubscription(auth.session),
    ]);

    if (!profile) {
        return jsonError("not_found", "Profilo non trovato", 404);
    }

    return jsonOk({
        profile,
        trainer_branding: branding,
        active_subscription: subscription,
    });
}

interface PatchBody {
    telefono?: string | null;
}

export async function PATCH(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if ("session" in auth === false) return auth;

    let body: PatchBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    await updateClientProfile(auth.session, { telefono: body.telefono ?? null });
    const profile = await getClientProfile(auth.session);
    return jsonOk({ profile });
}
