import { NextRequest } from "next/server";
import {
    getRequestIp,
    getRequestUserAgent,
    issueTokensForClient,
    jsonError,
    jsonOk,
} from "@/lib/api-auth";
import { authenticateClient } from "@/lib/services/auth.service";

export const runtime = "nodejs";

interface LoginBody {
    email?: string;
    password?: string;
    device_id?: string;
}

export async function POST(req: NextRequest) {
    let body: LoginBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    const result = await authenticateClient({
        email,
        password,
        ipKey: getRequestIp(req),
    });

    if (!result.success) {
        return jsonError(
            result.status === 429 ? "rate_limited" : "invalid_credentials",
            result.error,
            result.status,
            result.retryAfter ? { retry_after: result.retryAfter } : undefined
        );
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
