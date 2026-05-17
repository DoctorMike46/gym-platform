import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { audit_logs } from "@/db/schema";
import { lt } from "drizzle-orm";
import { logAudit } from "@/lib/audit-log";

export const runtime = "nodejs";

/**
 * Cron job: pulisce gli audit_logs più vecchi del periodo di retention
 * configurato (default 365 giorni, override via env AUDIT_LOG_RETENTION_DAYS).
 *
 * GDPR art.5(1)(e): i dati personali devono essere conservati "non oltre il
 * tempo necessario al conseguimento delle finalità". Gli audit log servono
 * a investigare data breach e a rispondere all'art.15 ("chi ha visto i
 * miei dati?"); 12 mesi è un compromesso ragionevole. Per audit log di
 * accessi a dati sanitari (art.9) puoi alzare a 24-36 mesi modificando
 * la env.
 *
 * Schedule consigliata: settimanale (vedi vercel.json).
 * Protezione: header `Authorization: Bearer <CRON_SECRET>` oppure
 * Vercel Cron mette automaticamente l'header `x-vercel-cron`.
 */
export async function GET(req: NextRequest) {
    const auth =
        req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}` ||
        req.headers.get("x-vercel-cron") !== null;
    if (!auth && process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const retentionDays = Number.parseInt(process.env.AUDIT_LOG_RETENTION_DAYS ?? "365", 10);
    if (!Number.isFinite(retentionDays) || retentionDays < 30) {
        return NextResponse.json(
            { error: "AUDIT_LOG_RETENTION_DAYS deve essere un intero >= 30" },
            { status: 500 },
        );
    }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const deleted = await db
        .delete(audit_logs)
        .where(lt(audit_logs.created_at, cutoff))
        .returning({ id: audit_logs.id });

    // Logga la propria esecuzione (resta perché >> oggi - retention)
    await logAudit({
        actor: { type: "system" },
        action: "audit_log.retention_cleanup",
        resourceType: "audit_logs",
        metadata: {
            retention_days: retentionDays,
            deleted_count: deleted.length,
            cutoff: cutoff.toISOString(),
        },
        request: req,
    });

    return NextResponse.json({
        ok: true,
        retention_days: retentionDays,
        cutoff: cutoff.toISOString(),
        deleted: deleted.length,
    });
}
