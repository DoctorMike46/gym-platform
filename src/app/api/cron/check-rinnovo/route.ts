import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
    questionnaire_assignments,
    questionnaire_templates,
    subscriptions,
} from "@/db/schema";
import { and, between, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { sendPushToClient } from "@/lib/fcm";

export const runtime = "nodejs";

/**
 * Cron job giornaliero: invia il questionario CHECK RINNOVO ai clienti
 * la cui subscription attiva scade tra 6 settimane (±1 giorno).
 * A 2 settimane invia un reminder se non è ancora stato risposto.
 *
 * Da chiamare ogni notte (es. via Vercel Cron).
 *
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

    const today = new Date();
    const sixWeeksAgo = isoDate(today, 6 * 7);
    const sixWeeksAgoMinus = isoDate(today, 6 * 7 - 1);
    const sixWeeksAgoPlus = isoDate(today, 6 * 7 + 1);
    const twoWeeksAgo = isoDate(today, 2 * 7);

    // ─── 6 settimane: crea nuovo assignment se non esiste ──────────────
    const expiringSoon = await db
        .select({
            sub_id: subscriptions.id,
            client_id: subscriptions.client_id,
            trainer_id: sql<number>`(SELECT trainer_id FROM clients WHERE id = ${subscriptions.client_id})`,
            data_fine: subscriptions.data_fine,
        })
        .from(subscriptions)
        .where(
            and(
                eq(subscriptions.status, "attivo"),
                between(subscriptions.data_fine, sixWeeksAgoMinus, sixWeeksAgoPlus)
            )
        );

    let createdCount = 0;
    let reminderCount = 0;
    const errors: string[] = [];

    for (const s of expiringSoon) {
        if (s.trainer_id == null) continue;
        const [template] = await db
            .select({ id: questionnaire_templates.id })
            .from(questionnaire_templates)
            .where(
                and(
                    eq(questionnaire_templates.trainer_id, s.trainer_id),
                    eq(questionnaire_templates.tipo, "check_rinnovo"),
                    eq(questionnaire_templates.is_active, true)
                )
            )
            .limit(1);
        if (!template) continue;

        // Skip se esiste già un assignment per questa subscription
        const [existing] = await db
            .select({ id: questionnaire_assignments.id })
            .from(questionnaire_assignments)
            .where(eq(questionnaire_assignments.subscription_id, s.sub_id))
            .limit(1);
        if (existing) continue;

        try {
            const [created] = await db
                .insert(questionnaire_assignments)
                .values({
                    template_id: template.id,
                    client_id: s.client_id,
                    trainer_id: s.trainer_id,
                    subscription_id: s.sub_id,
                    status: "pending",
                    motivo: `Check rinnovo · scadenza ${formatItalianDate(s.data_fine ?? "")}`,
                })
                .returning({ id: questionnaire_assignments.id });

            sendPushToClient(s.client_id, {
                title: "Check rinnovo: compila il questionario",
                body:
                    "Il tuo abbonamento sta per scadere. Compila il questionario per rinnovare la programmazione.",
                data: {
                    type: "questionnaire_check_rinnovo",
                    assignment_id: String(created.id),
                },
            }).catch(() => {});

            createdCount++;
        } catch (e) {
            errors.push(`sub_id=${s.sub_id}: ${String(e)}`);
        }
    }

    // ─── 2 settimane: reminder se ancora pending e mai inviato ─────────
    const expiringVerySoon = await db
        .select({
            sub_id: subscriptions.id,
            client_id: subscriptions.client_id,
            data_fine: subscriptions.data_fine,
        })
        .from(subscriptions)
        .where(
            and(
                eq(subscriptions.status, "attivo"),
                eq(subscriptions.data_fine, twoWeeksAgo)
            )
        );

    for (const s of expiringVerySoon) {
        const [a] = await db
            .select()
            .from(questionnaire_assignments)
            .where(
                and(
                    eq(questionnaire_assignments.subscription_id, s.sub_id),
                    eq(questionnaire_assignments.status, "pending"),
                    isNull(questionnaire_assignments.reminder_sent_at)
                )
            )
            .limit(1);
        if (!a) continue;

        try {
            await db
                .update(questionnaire_assignments)
                .set({ reminder_sent_at: new Date() })
                .where(eq(questionnaire_assignments.id, a.id));

            sendPushToClient(s.client_id, {
                title: "Promemoria: questionario in scadenza",
                body:
                    "L'abbonamento scade tra 2 settimane. Completa il questionario per non interrompere il percorso.",
                data: {
                    type: "questionnaire_reminder",
                    assignment_id: String(a.id),
                },
            }).catch(() => {});

            reminderCount++;
        } catch (e) {
            errors.push(`reminder a=${a.id}: ${String(e)}`);
        }
    }

    return NextResponse.json({
        ok: true,
        date: today.toISOString().slice(0, 10),
        created: createdCount,
        reminders: reminderCount,
        scanned: expiringSoon.length + expiringVerySoon.length,
        errors: errors.length > 0 ? errors : undefined,
    });
}

/** ISO date YYYY-MM-DD shiftata di `daysAhead` giorni dal `base`. */
function isoDate(base: Date, daysAhead: number): string {
    const d = new Date(base);
    d.setDate(d.getDate() + daysAhead);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatItalianDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString("it-IT", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    } catch {
        return iso;
    }
}
