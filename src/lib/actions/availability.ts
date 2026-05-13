"use server";

import { db } from "@/db";
import { availability_overrides, availability_rules } from "@/db/schema";
import { and, asc, between, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTrainer } from "@/lib/auth";

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validHHMM(v: unknown): string | null {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return HHMM_RE.test(s) ? s : null;
}

function timeToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
    return h * 60 + m;
}

// ─── Availability Rules (settimanali) ──────────────────────────

export async function listAvailabilityRules() {
    const trainer = await getAuthenticatedTrainer();
    return db
        .select()
        .from(availability_rules)
        .where(eq(availability_rules.trainer_id, trainer.id))
        .orderBy(
            asc(availability_rules.giorno_settimana),
            asc(availability_rules.start_time)
        );
}

interface RuleInput {
    giorno_settimana: number;
    start_time: string;
    end_time: string;
}

/**
 * Sostituisce in blocco tutte le regole settimanali del trainer.
 * Più semplice che esporre create/update/delete singoli.
 */
export async function replaceAvailabilityRules(rules: RuleInput[]) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const cleaned: RuleInput[] = [];
        for (const r of rules) {
            if (!r) continue;
            if (
                !Number.isInteger(r.giorno_settimana) ||
                r.giorno_settimana < 1 ||
                r.giorno_settimana > 7
            )
                continue;
            const start = validHHMM(r.start_time);
            const end = validHHMM(r.end_time);
            if (!start || !end) continue;
            if (timeToMinutes(start) >= timeToMinutes(end)) continue;
            cleaned.push({
                giorno_settimana: r.giorno_settimana,
                start_time: start,
                end_time: end,
            });
        }

        await db
            .delete(availability_rules)
            .where(eq(availability_rules.trainer_id, trainer.id));

        if (cleaned.length > 0) {
            await db.insert(availability_rules).values(
                cleaned.map((r) => ({
                    trainer_id: trainer.id,
                    giorno_settimana: r.giorno_settimana,
                    start_time: r.start_time,
                    end_time: r.end_time,
                }))
            );
        }

        revalidatePath("/availability");
        return { success: true, saved: cleaned.length };
    } catch (e) {
        console.error("Errore replace availability rules:", e);
        return { success: false, error: "Errore interno server" };
    }
}

// ─── Availability Overrides (eccezioni) ────────────────────────

/**
 * Lista overrides in un intervallo di date (default: prossimi 90 giorni).
 */
export async function listAvailabilityOverrides(
    fromIso?: string,
    toIso?: string
) {
    const trainer = await getAuthenticatedTrainer();
    const from = fromIso ?? new Date().toISOString().slice(0, 10);
    const to =
        toIso ??
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
    return db
        .select()
        .from(availability_overrides)
        .where(
            and(
                eq(availability_overrides.trainer_id, trainer.id),
                between(availability_overrides.data, from, to)
            )
        )
        .orderBy(asc(availability_overrides.data));
}

export async function createAvailabilityOverride(formData: FormData) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const data = formData.get("data") as string | null;
        const tipo = (formData.get("tipo") as string | null) || "blocked";
        const motivo = (formData.get("motivo") as string | null) || null;
        const startRaw = formData.get("start_time") as string | null;
        const endRaw = formData.get("end_time") as string | null;

        if (!data) return { success: false, error: "Data obbligatoria" };
        if (tipo !== "blocked" && tipo !== "custom") {
            return { success: false, error: "Tipo non valido" };
        }

        let start: string | null = null;
        let end: string | null = null;
        if (tipo === "custom" || (startRaw && endRaw)) {
            start = validHHMM(startRaw);
            end = validHHMM(endRaw);
            if (!start || !end) {
                return { success: false, error: "Orari non validi (HH:MM)" };
            }
            if (timeToMinutes(start) >= timeToMinutes(end)) {
                return {
                    success: false,
                    error: "L'orario fine deve essere dopo l'inizio",
                };
            }
        }

        await db.insert(availability_overrides).values({
            trainer_id: trainer.id,
            data,
            tipo,
            start_time: start,
            end_time: end,
            motivo,
        });

        revalidatePath("/availability");
        return { success: true };
    } catch (e) {
        console.error("Errore create override:", e);
        return { success: false, error: "Errore interno server" };
    }
}

export async function deleteAvailabilityOverride(id: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await db
            .delete(availability_overrides)
            .where(
                and(
                    eq(availability_overrides.id, id),
                    eq(availability_overrides.trainer_id, trainer.id)
                )
            );
        revalidatePath("/availability");
        return { success: true };
    } catch (e) {
        console.error("Errore delete override:", e);
        return { success: false, error: "Errore interno server" };
    }
}
