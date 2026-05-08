import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth, revokeAllRefreshTokensForClient } from "@/lib/api-auth";
import { changeClientPassword } from "@/lib/services/profile.service";

export const runtime = "nodejs";

interface PasswordBody {
    current_password?: string;
    new_password?: string;
}

export async function POST(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if ("session" in auth === false) return auth;

    let body: PasswordBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!body.current_password || !body.new_password) {
        return jsonError("missing_fields", "current_password e new_password richiesti", 400);
    }

    const result = await changeClientPassword(
        auth.session,
        body.current_password,
        body.new_password
    );
    if (!result.success) {
        return jsonError("invalid_password", result.error, 400);
    }

    // Invalida tutti i refresh tokens del cliente: dovrà ri-loggarsi sugli altri device
    await revokeAllRefreshTokensForClient(auth.session.id);

    return jsonOk({ success: true });
}
