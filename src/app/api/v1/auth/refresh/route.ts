import { NextRequest } from "next/server";
import { getRequestUserAgent, jsonError, jsonOk, rotateRefreshToken } from "@/lib/api-auth";

export const runtime = "nodejs";

interface RefreshBody {
    refresh_token?: string;
}

export async function POST(req: NextRequest) {
    let body: RefreshBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!body.refresh_token) {
        return jsonError("missing_refresh_token", "refresh_token richiesto", 400);
    }

    const result = await rotateRefreshToken(body.refresh_token, {
        user_agent: getRequestUserAgent(req),
    });

    if (!result.success) {
        return jsonError(result.error, "Refresh token non valido", 401);
    }

    return jsonOk(result.tokens);
}
