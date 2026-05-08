import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { getR2SignedUrl } from "@/lib/r2";
import { db } from "@/db";
import { documents, progress_photos } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * Restituisce un signed GET URL per una r2_key, ma SOLO se la chiave è
 * effettivamente associata al cliente autenticato (foto progresso o documento).
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    if (!key) {
        return jsonError("missing_key", "key richiesto come query param", 400);
    }

    const [doc] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(and(eq(documents.r2_key, key), eq(documents.client_id, auth.session.id)))
        .limit(1);

    let allowed = !!doc;
    if (!allowed) {
        const [photo] = await db
            .select({ id: progress_photos.id })
            .from(progress_photos)
            .where(
                and(
                    eq(progress_photos.r2_key, key),
                    eq(progress_photos.client_id, auth.session.id)
                )
            )
            .limit(1);
        allowed = !!photo;
    }

    if (!allowed) {
        return jsonError("forbidden", "Risorsa non accessibile", 403);
    }

    const signed = await getR2SignedUrl(key);
    return jsonOk({ url: signed, expires_in: 3600 });
}
