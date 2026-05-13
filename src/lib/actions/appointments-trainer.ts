"use server";

import { db } from "@/db";
import {
    appointment_types,
    appointments,
    clients,
} from "@/db/schema";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTrainer } from "@/lib/auth";
import { sendPushToClient } from "@/lib/fcm";

function formatDateTimeIt(d: Date): string {
    const date = d.toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
    const time = d.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
    });
    return `${date} alle ${time}`;
}

export interface AppointmentFilters {
    status?: string; // 'all' | uno status valido
    from?: string;   // ISO date (YYYY-MM-DD)
    to?: string;     // ISO date (YYYY-MM-DD)
    clientId?: number;
    /** 'upcoming' = solo dal momento attuale in poi */
    timeframe?: "upcoming" | "past" | "all";
}

/**
 * Lista prenotazioni del trainer con join cliente e tipo.
 */
export async function listTrainerAppointments(filters: AppointmentFilters = {}) {
    const trainer = await getAuthenticatedTrainer();

    const conditions = [eq(appointments.trainer_id, trainer.id)];
    if (filters.status && filters.status !== "all") {
        conditions.push(eq(appointments.status, filters.status));
    }
    if (filters.clientId) {
        conditions.push(eq(appointments.client_id, filters.clientId));
    }
    if (filters.from) {
        conditions.push(gte(appointments.start_at, new Date(filters.from)));
    }
    if (filters.to) {
        conditions.push(lte(appointments.start_at, new Date(filters.to)));
    }
    if (filters.timeframe === "upcoming") {
        conditions.push(gte(appointments.start_at, new Date()));
    } else if (filters.timeframe === "past") {
        conditions.push(lte(appointments.end_at, new Date()));
    }

    const rows = await db
        .select({
            id: appointments.id,
            start_at: appointments.start_at,
            end_at: appointments.end_at,
            status: appointments.status,
            modalita: appointments.modalita,
            cliente_note: appointments.cliente_note,
            trainer_note: appointments.trainer_note,
            cancelled_reason: appointments.cancelled_reason,
            confirmed_at: appointments.confirmed_at,
            cancelled_at: appointments.cancelled_at,
            created_at: appointments.created_at,
            client_id: appointments.client_id,
            client_nome: clients.nome,
            client_cognome: clients.cognome,
            client_email: clients.email,
            type_id: appointment_types.id,
            type_nome: appointment_types.nome,
            type_durata: appointment_types.durata_minuti,
            type_colore: appointment_types.colore_hex,
        })
        .from(appointments)
        .leftJoin(clients, eq(clients.id, appointments.client_id))
        .leftJoin(
            appointment_types,
            eq(appointment_types.id, appointments.appointment_type_id)
        )
        .where(and(...conditions))
        .orderBy(
            filters.timeframe === "past"
                ? desc(appointments.start_at)
                : asc(appointments.start_at)
        );

    return rows;
}

export async function getAppointmentDetail(id: number) {
    const trainer = await getAuthenticatedTrainer();
    const [row] = await db
        .select({
            appt: appointments,
            client: clients,
            type: appointment_types,
        })
        .from(appointments)
        .leftJoin(clients, eq(clients.id, appointments.client_id))
        .leftJoin(
            appointment_types,
            eq(appointment_types.id, appointments.appointment_type_id)
        )
        .where(
            and(
                eq(appointments.id, id),
                eq(appointments.trainer_id, trainer.id)
            )
        )
        .limit(1);
    return row ?? null;
}

/** Conferma una prenotazione pending. */
export async function confirmAppointment(id: number, trainerNote?: string) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const [existing] = await db
            .select({
                client_id: appointments.client_id,
                start_at: appointments.start_at,
            })
            .from(appointments)
            .where(
                and(
                    eq(appointments.id, id),
                    eq(appointments.trainer_id, trainer.id),
                    eq(appointments.status, "pending")
                )
            )
            .limit(1);
        if (!existing) {
            return { success: false, error: "Prenotazione non trovata" };
        }

        await db
            .update(appointments)
            .set({
                status: "confirmed",
                confirmed_at: new Date(),
                trainer_note: trainerNote?.trim() || null,
                updated_at: new Date(),
            })
            .where(eq(appointments.id, id));

        // Push al cliente (non-blocking nel try/catch)
        sendPushToClient(existing.client_id, {
            title: "Prenotazione confermata ✓",
            body: `La tua sessione del ${formatDateTimeIt(existing.start_at)} è stata confermata.`,
            data: { type: "booking_confirmed", id: String(id) },
        }).catch((err) => console.warn("[push] confirm failed:", err));

        revalidatePath("/bookings");
        return { success: true };
    } catch (e) {
        console.error("Errore conferma prenotazione:", e);
        return { success: false, error: "Errore interno server" };
    }
}

/** Cancella una prenotazione lato trainer. Stati ammessi: pending o confirmed. */
export async function cancelAppointmentByTrainer(id: number, reason: string) {
    const trainer = await getAuthenticatedTrainer();
    try {
        if (!reason || reason.trim().length === 0) {
            return { success: false, error: "Motivo cancellazione obbligatorio" };
        }
        const [existing] = await db
            .select({
                client_id: appointments.client_id,
                start_at: appointments.start_at,
            })
            .from(appointments)
            .where(
                and(
                    eq(appointments.id, id),
                    eq(appointments.trainer_id, trainer.id)
                )
            )
            .limit(1);
        if (!existing) {
            return { success: false, error: "Prenotazione non trovata" };
        }

        await db
            .update(appointments)
            .set({
                status: "cancelled_trainer",
                cancelled_at: new Date(),
                cancelled_reason: reason.trim(),
                updated_at: new Date(),
            })
            .where(eq(appointments.id, id));

        sendPushToClient(existing.client_id, {
            title: "Prenotazione cancellata",
            body: `Il trainer ha cancellato la sessione del ${formatDateTimeIt(existing.start_at)}: ${reason.trim()}`,
            data: { type: "booking_cancelled_trainer", id: String(id) },
        }).catch((err) => console.warn("[push] cancel failed:", err));

        revalidatePath("/bookings");
        return { success: true };
    } catch (e) {
        console.error("Errore cancellazione trainer:", e);
        return { success: false, error: "Errore interno server" };
    }
}

/** Marca come completata (al termine della sessione). */
export async function markAppointmentCompleted(id: number, trainerNote?: string) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await db
            .update(appointments)
            .set({
                status: "completed",
                trainer_note: trainerNote?.trim() || null,
                updated_at: new Date(),
            })
            .where(
                and(
                    eq(appointments.id, id),
                    eq(appointments.trainer_id, trainer.id),
                    eq(appointments.status, "confirmed")
                )
            );
        revalidatePath("/bookings");
        return { success: true };
    } catch (e) {
        console.error("Errore mark completed:", e);
        return { success: false, error: "Errore interno server" };
    }
}

/** Marca come "cliente non presentato". */
export async function markAppointmentNoShow(id: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await db
            .update(appointments)
            .set({
                status: "no_show",
                updated_at: new Date(),
            })
            .where(
                and(
                    eq(appointments.id, id),
                    eq(appointments.trainer_id, trainer.id),
                    eq(appointments.status, "confirmed")
                )
            );
        revalidatePath("/bookings");
        return { success: true };
    } catch (e) {
        console.error("Errore mark no-show:", e);
        return { success: false, error: "Errore interno server" };
    }
}

/** Conteggio veloce per la sidebar/dashboard. */
export async function countPendingAppointments() {
    const trainer = await getAuthenticatedTrainer();
    const rows = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(
            and(
                eq(appointments.trainer_id, trainer.id),
                eq(appointments.status, "pending")
            )
        );
    return rows.length;
}
