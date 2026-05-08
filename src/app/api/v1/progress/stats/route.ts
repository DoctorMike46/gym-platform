import { NextRequest } from "next/server";
import { jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getClientProgressStats } from "@/lib/services/progress.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;
    const stats = await getClientProgressStats(auth.session);
    return jsonOk(stats);
}
