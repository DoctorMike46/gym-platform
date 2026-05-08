import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-auth";
import { resetClientPassword } from "@/lib/services/auth.service";

export const runtime = "nodejs";

interface ResetBody {
    token?: string;
    password?: string;
}

export async function POST(req: NextRequest) {
    let body: ResetBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!body.token || !body.password) {
        return jsonError("missing_fields", "token e password richiesti", 400);
    }

    const result = await resetClientPassword(body.token, body.password);
    if (!result.success) {
        return jsonError("invalid_token", result.error, 400);
    }
    return jsonOk({ success: true });
}
