import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthenticatedTrainerSafe } from "@/lib/auth";
import { getR2SignedUrl } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * GET /api/media/questionnaire-attachment?key=...
 * Restituisce un signed URL per visualizzare un allegato di una risposta
 * a questionario. Solo il trainer proprietario del cliente può accedere.
 *
 * Risponde con un redirect 302 al signed URL (così si può usare in <img src>).
 */
export async function GET(req: NextRequest) {
    const trainer = await getAuthenticatedTrainerSafe();
    if (!trainer) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const key = new URL(req.url).searchParams.get("key");
    if (!key) {
        return NextResponse.json({ error: "key required" }, { status: 400 });
    }

    // Path key: clients/<clientId>/questionnaires/<assignmentId>/...
    const m = key.match(/^clients\/(\d+)\/questionnaires\/(\d+)\//);
    if (!m) {
        return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }
    const clientId = parseInt(m[1], 10);

    // Verifica ownership trainer → cliente
    const [c] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(
            and(
                eq(clients.id, clientId),
                eq(clients.trainer_id, trainer.id)
            )
        )
        .limit(1);
    if (!c) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const signed = await getR2SignedUrl(key);
    return NextResponse.redirect(signed, 302);
}
