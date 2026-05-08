import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getR2SignedUrl } from "@/lib/r2";
import type { ClientSession } from "@/lib/client-auth";

export async function listClientDocuments(session: ClientSession) {
    return db
        .select()
        .from(documents)
        .where(eq(documents.client_id, session.id))
        .orderBy(desc(documents.created_at));
}

export async function getClientDocumentDownloadUrl(
    session: ClientSession,
    documentId: number
): Promise<string> {
    const [doc] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.client_id, session.id)))
        .limit(1);
    if (!doc) throw new Error("Documento non trovato");
    return getR2SignedUrl(doc.r2_key);
}
