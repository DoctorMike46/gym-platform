import { NextRequest } from "next/server";
import { jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { listClientDocuments } from "@/lib/services/documents.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const docs = await listClientDocuments(auth.session);
    return jsonOk({ documents: docs });
}
