import { NextRequest } from "next/server";
import {
    getRequestUserAgent,
    issueTokensForClient,
    jsonError,
    jsonOk,
} from "@/lib/api-auth";
import { completeClientOnboarding } from "@/lib/services/auth.service";

export const runtime = "nodejs";

interface CompleteBody {
    invite_token?: string;
    password?: string;
    accept_terms?: boolean;
    /** Consenso esplicito al trattamento dei dati di salute (art. 9 GDPR). */
    accept_health?: boolean;
    /** Consenso opzionale al marketing. */
    accept_marketing?: boolean;
    device_id?: string;
}

export async function POST(req: NextRequest) {
    let body: CompleteBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!body.invite_token || !body.password) {
        return jsonError("missing_fields", "invite_token e password richiesti", 400);
    }

    const result = await completeClientOnboarding(
        body.invite_token,
        body.password,
        {
            terms: body.accept_terms === true,
            health: body.accept_health === true,
            marketing: body.accept_marketing === true,
        }
    );

    if (!result.success) {
        return jsonError("onboarding_failed", result.error, 400);
    }

    const tokens = await issueTokensForClient(result.client, {
        device_id: body.device_id ?? null,
        user_agent: getRequestUserAgent(req),
    });

    return jsonOk({
        ...tokens,
        client: {
            id: result.client.id,
            email: result.client.email,
            trainer_id: result.client.trainer_id,
        },
    });
}
