"use server";

import { db } from "@/db";
import { appointment_types } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTrainer } from "@/lib/auth";

const VALID_MODALITA = ["online", "in_presenza", "entrambi"] as const;

function parseIntOrNull(v: unknown): number | null {
    if (v === null || v === undefined || v === "") return null;
    const n = parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : null;
}

export async function listAppointmentTypes() {
    const trainer = await getAuthenticatedTrainer();
    return db
        .select()
        .from(appointment_types)
        .where(
            and(
                eq(appointment_types.trainer_id, trainer.id),
                eq(appointment_types.is_active, true)
            )
        )
        .orderBy(asc(appointment_types.nome));
}

export async function createAppointmentType(formData: FormData) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const nome = (formData.get("nome") as string | null)?.trim();
        const durata = parseIntOrNull(formData.get("durata_minuti"));
        if (!nome || !durata || durata < 5) {
            return { success: false, error: "Nome e durata (min 5min) obbligatori" };
        }
        const descrizione = (formData.get("descrizione") as string | null) || null;
        const colore = (formData.get("colore_hex") as string | null) || "#3b82f6";
        const prezzoEuro = formData.get("prezzo_euro") as string | null;
        const prezzo_centesimi = prezzoEuro
            ? Math.round(parseFloat(prezzoEuro.replace(",", ".")) * 100)
            : null;
        let modalita = (formData.get("modalita") as string | null) || "in_presenza";
        if (!VALID_MODALITA.includes(modalita as (typeof VALID_MODALITA)[number])) {
            modalita = "in_presenza";
        }

        await db.insert(appointment_types).values({
            trainer_id: trainer.id,
            nome,
            descrizione,
            durata_minuti: durata,
            colore_hex: colore,
            prezzo_centesimi,
            modalita,
        });

        revalidatePath("/availability");
        return { success: true };
    } catch (e) {
        console.error("Errore creazione appointment type:", e);
        return { success: false, error: "Errore interno server" };
    }
}

export async function updateAppointmentType(id: number, formData: FormData) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const [existing] = await db
            .select()
            .from(appointment_types)
            .where(
                and(
                    eq(appointment_types.id, id),
                    eq(appointment_types.trainer_id, trainer.id)
                )
            )
            .limit(1);
        if (!existing) return { success: false, error: "Non trovato" };

        const nome = (formData.get("nome") as string | null)?.trim();
        const durata = parseIntOrNull(formData.get("durata_minuti"));
        if (!nome || !durata || durata < 5) {
            return { success: false, error: "Nome e durata (min 5min) obbligatori" };
        }
        const descrizione = (formData.get("descrizione") as string | null) || null;
        const colore = (formData.get("colore_hex") as string | null) || "#3b82f6";
        const prezzoEuro = formData.get("prezzo_euro") as string | null;
        const prezzo_centesimi = prezzoEuro
            ? Math.round(parseFloat(prezzoEuro.replace(",", ".")) * 100)
            : null;
        let modalita = (formData.get("modalita") as string | null) || "in_presenza";
        if (!VALID_MODALITA.includes(modalita as (typeof VALID_MODALITA)[number])) {
            modalita = "in_presenza";
        }

        await db
            .update(appointment_types)
            .set({
                nome,
                descrizione,
                durata_minuti: durata,
                colore_hex: colore,
                prezzo_centesimi,
                modalita,
                updated_at: new Date(),
            })
            .where(eq(appointment_types.id, id));

        revalidatePath("/availability");
        return { success: true };
    } catch (e) {
        console.error("Errore aggiornamento appointment type:", e);
        return { success: false, error: "Errore interno server" };
    }
}

/**
 * Soft delete: imposta is_active=false per non rompere prenotazioni
 * storiche che la referenziano (FK ON DELETE SET NULL).
 */
export async function deleteAppointmentType(id: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await db
            .update(appointment_types)
            .set({ is_active: false, updated_at: new Date() })
            .where(
                and(
                    eq(appointment_types.id, id),
                    eq(appointment_types.trainer_id, trainer.id)
                )
            );
        revalidatePath("/availability");
        return { success: true };
    } catch (e) {
        console.error("Errore eliminazione appointment type:", e);
        return { success: false, error: "Errore interno server" };
    }
}
