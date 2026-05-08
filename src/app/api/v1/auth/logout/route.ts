import { NextRequest } from "next/server";
import { jsonError, jsonOk, revokeRefreshToken } from "@/lib/api-auth";

export const runtime = "nodejs";

interface LogoutBody {
    refresh_token?: string;
}

export async function POST(req: NextRequest) {
    let body: LogoutBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (body.refresh_token) {
        await revokeRefreshToken(body.refresh_token);
    }

    return jsonOk({ success: true });
}
