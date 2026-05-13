import { NextRequest } from "next/server";
import { jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { listPendingQuestionnairesForClient } from "@/lib/services/questionnaires.service";

export const runtime = "nodejs";

/** GET /api/v1/me/questionnaires — lista questionari pending del cliente. */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;
    const items = await listPendingQuestionnairesForClient(auth.session);
    return jsonOk({ questionnaires: items });
}
