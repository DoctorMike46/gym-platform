import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-auth";
import { validateClientInviteToken } from "@/lib/services/auth.service";

export const runtime = "nodejs";

interface ValidateBody {
    invite_token?: string;
}

export async function POST(req: NextRequest) {
    let body: ValidateBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!body.invite_token) {
        return jsonError("missing_token", "invite_token richiesto", 400);
    }

    const result = await validateClientInviteToken(body.invite_token);
    if (!result.valid) {
        return jsonError("invalid_invite", result.reason, 400);
    }

    return jsonOk({
        client: {
            id: result.clientId,
            email: result.email,
            nome: result.nome,
            cognome: result.cognome,
        },
    });
}
