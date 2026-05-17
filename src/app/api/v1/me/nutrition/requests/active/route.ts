import { NextRequest } from "next/server";
import { jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getActiveRequestForClient } from "@/lib/services/nutrition-requests.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const request = await getActiveRequestForClient(auth.session.id);
    return jsonOk({ request });
}
