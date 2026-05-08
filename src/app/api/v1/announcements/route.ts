import { NextRequest } from "next/server";
import { db } from "@/db";
import { announcement_recipients, announcements } from "@/db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { jsonOk, requireApiClientAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * Restituisce gli annunci pubblicati del trainer del cliente,
 * filtrando per destinatari ('tutti' o ID nella tabella recipients).
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const rows = await db
        .select({
            id: announcements.id,
            titolo: announcements.titolo,
            contenuto: announcements.contenuto,
            tipo: announcements.tipo,
            image_r2_key: announcements.image_r2_key,
            created_at: announcements.created_at,
            updated_at: announcements.updated_at,
        })
        .from(announcements)
        .leftJoin(
            announcement_recipients,
            eq(announcement_recipients.announcement_id, announcements.id)
        )
        .where(
            and(
                eq(announcements.trainer_id, auth.session.trainer_id),
                eq(announcements.pubblicato, true),
                or(
                    eq(announcements.destinatari, "tutti"),
                    eq(announcement_recipients.client_id, auth.session.id)
                )
            )
        )
        .groupBy(announcements.id)
        .orderBy(desc(announcements.created_at));

    return jsonOk({ announcements: rows });
}
