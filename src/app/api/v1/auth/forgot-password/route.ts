import { NextRequest } from "next/server";
import { getRequestIp, jsonError, jsonOk } from "@/lib/api-auth";
import { requestClientPasswordReset } from "@/lib/services/auth.service";

export const runtime = "nodejs";

interface ForgotBody {
    email?: string;
}

export async function POST(req: NextRequest) {
    let body: ForgotBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    const email = (body.email || "").trim().toLowerCase();
    if (!email) {
        return jsonError("missing_email", "email richiesta", 400);
    }

    const result = await requestClientPasswordReset({
        email,
        ipKey: getRequestIp(req),
    });

    if (!result.success) {
        return jsonError(
            result.retryAfter ? "rate_limited" : "internal_error",
            result.error,
            result.retryAfter ? 429 : 500,
            result.retryAfter ? { retry_after: result.retryAfter } : undefined
        );
    }

    // Risposta uniforme per non rivelare l'esistenza di un account
    return jsonOk({ success: true });
}
