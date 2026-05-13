import { db } from "@/db";
import {
    appointment_types,
    appointments,
    availability_overrides,
    availability_rules,
    clients,
} from "@/db/schema";
import { and, asc, between, eq, gte, inArray, lte, or } from "drizzle-orm";
import type { ClientSession } from "@/lib/client-auth";

const ACTIVE_STATUSES = ["pending", "confirmed"] as const;

function timeToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
    return h * 60 + m;
}

function minutesToHHMM(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isoDateOf(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * weekday: 1=Lunedì … 7=Domenica (JS Sunday=0 → 7).
 */
function weekdayMon1(d: Date): number {
    const js = d.getDay();
    return js === 0 ? 7 : js;
}

export interface BookingSlot {
    start: string; // ISO datetime
    end: string;   // ISO datetime
}

/**
 * Trainer_id del cliente (l'unico trainer al quale può prenotare).
 */
async function getClientTrainerId(clientId: number): Promise<number | null> {
    const [c] = await db
        .select({ trainer_id: clients.trainer_id })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);
    return c?.trainer_id ?? null;
}

/**
 * Lista tipologie attive del trainer del cliente.
 */
export async function listAppointmentTypesForClient(session: ClientSession) {
    const rows = await db
        .select({
            id: appointment_types.id,
            nome: appointment_types.nome,
            descrizione: appointment_types.descrizione,
            durata_minuti: appointment_types.durata_minuti,
            colore_hex: appointment_types.colore_hex,
            prezzo_centesimi: appointment_types.prezzo_centesimi,
            modalita: appointment_types.modalita,
        })
        .from(appointment_types)
        .where(
            and(
                eq(appointment_types.trainer_id, session.trainer_id),
                eq(appointment_types.is_active, true)
            )
        )
        .orderBy(asc(appointment_types.nome));
    return rows;
}

/**
 * Calcola gli slot disponibili in un intervallo di date per una durata.
 * Algoritmo:
 *   1. Per ogni data nel range, carica le rules del giorno_settimana
 *   2. Applica gli overrides: se 'blocked' su quel giorno → skip;
 *      se 'custom' → sostituisce le rules con le fasce override
 *   3. Sottrae le prenotazioni 'pending'/'confirmed' del trainer
 *   4. Suddivide le fasce risultanti in slot di `durationMin`
 *   5. Esclude slot che iniziano prima di "now + minLeadHours"
 */
export async function getAvailableSlots(
    session: ClientSession,
    opts: {
        fromIso: string; // YYYY-MM-DD
        toIso: string;
        durationMin: number;
        minLeadHours?: number; // default 2
    }
): Promise<{ date: string; slots: BookingSlot[] }[]> {
    const trainerId = session.trainer_id;
    const minLead = opts.minLeadHours ?? 2;
    const duration = opts.durationMin;
    if (duration < 5 || duration > 480) return [];

    const fromDate = new Date(opts.fromIso + "T00:00:00");
    const toDate = new Date(opts.toIso + "T00:00:00");
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return [];
    if (fromDate > toDate) return [];

    const rules = await db
        .select()
        .from(availability_rules)
        .where(
            and(
                eq(availability_rules.trainer_id, trainerId),
                eq(availability_rules.is_active, true)
            )
        );

    const overrides = await db
        .select()
        .from(availability_overrides)
        .where(
            and(
                eq(availability_overrides.trainer_id, trainerId),
                between(availability_overrides.data, opts.fromIso, opts.toIso)
            )
        );
    const overridesByDate = new Map<string, typeof overrides>();
    for (const o of overrides) {
        const arr = overridesByDate.get(o.data) ?? [];
        arr.push(o);
        overridesByDate.set(o.data, arr);
    }

    // Carica appointments attivi nel range (slot occupati)
    const rangeStart = new Date(fromDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(toDate);
    rangeEnd.setHours(23, 59, 59, 999);
    const busy = await db
        .select({
            start_at: appointments.start_at,
            end_at: appointments.end_at,
        })
        .from(appointments)
        .where(
            and(
                eq(appointments.trainer_id, trainerId),
                inArray(appointments.status, ACTIVE_STATUSES as unknown as string[]),
                gte(appointments.start_at, rangeStart),
                lte(appointments.start_at, rangeEnd)
            )
        );

    const result: { date: string; slots: BookingSlot[] }[] = [];
    const earliestStartTs = Date.now() + minLead * 3600 * 1000;

    // Itera giorno per giorno
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
        const isoDate = isoDateOf(cursor);
        const weekday = weekdayMon1(cursor);
        const dayOverrides = overridesByDate.get(isoDate) ?? [];

        // Determina fasce disponibili del giorno
        let dayBands: { start: number; end: number }[] = [];

        const blockedFullDay = dayOverrides.some(
            (o) => o.tipo === "blocked" && !o.start_time
        );
        if (blockedFullDay) {
            dayBands = [];
        } else {
            const customOverrides = dayOverrides.filter((o) => o.tipo === "custom");
            if (customOverrides.length > 0) {
                // I custom sostituiscono le rules per il giorno
                for (const o of customOverrides) {
                    if (o.start_time && o.end_time) {
                        dayBands.push({
                            start: timeToMinutes(o.start_time),
                            end: timeToMinutes(o.end_time),
                        });
                    }
                }
            } else {
                for (const r of rules) {
                    if (r.giorno_settimana !== weekday) continue;
                    dayBands.push({
                        start: timeToMinutes(r.start_time),
                        end: timeToMinutes(r.end_time),
                    });
                }
            }
            // Sottrai le fasce 'blocked' parziali
            for (const o of dayOverrides) {
                if (o.tipo !== "blocked" || !o.start_time || !o.end_time) continue;
                const bStart = timeToMinutes(o.start_time);
                const bEnd = timeToMinutes(o.end_time);
                dayBands = subtractRange(dayBands, bStart, bEnd);
            }
        }

        // Sottrai gli appointments attivi del giorno
        const dayBusy = busy.filter(
            (b) => isoDateOf(new Date(b.start_at)) === isoDate
        );
        for (const b of dayBusy) {
            const bDate = new Date(b.start_at);
            const eDate = new Date(b.end_at);
            const bMin = bDate.getHours() * 60 + bDate.getMinutes();
            const eMin = eDate.getHours() * 60 + eDate.getMinutes();
            dayBands = subtractRange(dayBands, bMin, eMin);
        }

        // Genera slot di `duration` minuti dalle bands
        const slots: BookingSlot[] = [];
        for (const band of dayBands) {
            for (let m = band.start; m + duration <= band.end; m += duration) {
                const startDate = new Date(cursor);
                startDate.setHours(0, 0, 0, 0);
                startDate.setMinutes(m);
                const endDate = new Date(startDate);
                endDate.setMinutes(endDate.getMinutes() + duration);
                if (startDate.getTime() < earliestStartTs) continue;
                slots.push({
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                });
            }
        }
        if (slots.length > 0) {
            result.push({ date: isoDate, slots });
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return result;
}

function subtractRange(
    bands: { start: number; end: number }[],
    cutStart: number,
    cutEnd: number
): { start: number; end: number }[] {
    const result: { start: number; end: number }[] = [];
    for (const b of bands) {
        if (cutEnd <= b.start || cutStart >= b.end) {
            result.push(b);
            continue;
        }
        if (cutStart > b.start) result.push({ start: b.start, end: cutStart });
        if (cutEnd < b.end) result.push({ start: cutEnd, end: b.end });
    }
    return result;
}

/**
 * Crea una prenotazione richiesta dal cliente (status=pending).
 * Verifica: appointment_type appartiene al trainer del cliente, durata coerente,
 * slot ancora libero, lead-time minimo.
 */
export async function createBookingForClient(
    session: ClientSession,
    opts: {
        appointmentTypeId: number;
        startIso: string;
        clienteNote?: string;
        modalitaOverride?: "online" | "in_presenza";
    }
): Promise<
    | { ok: true; appointmentId: number }
    | { ok: false; error: string }
> {
    const trainerId = await getClientTrainerId(session.id);
    if (!trainerId || trainerId !== session.trainer_id) {
        return { ok: false, error: "Trainer non valido" };
    }

    const [type] = await db
        .select()
        .from(appointment_types)
        .where(
            and(
                eq(appointment_types.id, opts.appointmentTypeId),
                eq(appointment_types.trainer_id, trainerId),
                eq(appointment_types.is_active, true)
            )
        )
        .limit(1);
    if (!type) return { ok: false, error: "Tipologia non disponibile" };

    const startAt = new Date(opts.startIso);
    if (Number.isNaN(startAt.getTime())) {
        return { ok: false, error: "Data inizio non valida" };
    }
    if (startAt.getTime() < Date.now() + 60 * 60 * 1000) {
        return { ok: false, error: "Prenotazione troppo a ridosso" };
    }
    const endAt = new Date(startAt.getTime() + type.durata_minuti * 60 * 1000);

    // Verifica slot ancora libero (no overlap con prenotazioni attive)
    const overlap = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(
            and(
                eq(appointments.trainer_id, trainerId),
                inArray(appointments.status, ACTIVE_STATUSES as unknown as string[]),
                or(
                    and(
                        lte(appointments.start_at, startAt),
                        gte(appointments.end_at, startAt)
                    ),
                    and(
                        lte(appointments.start_at, endAt),
                        gte(appointments.end_at, endAt)
                    ),
                    and(
                        gte(appointments.start_at, startAt),
                        lte(appointments.end_at, endAt)
                    )
                )
            )
        )
        .limit(1);
    if (overlap.length > 0) {
        return { ok: false, error: "Slot non più disponibile" };
    }

    const modalita =
        opts.modalitaOverride && type.modalita === "entrambi"
            ? opts.modalitaOverride
            : type.modalita === "entrambi"
            ? "in_presenza"
            : type.modalita;

    const [inserted] = await db
        .insert(appointments)
        .values({
            trainer_id: trainerId,
            client_id: session.id,
            appointment_type_id: type.id,
            start_at: startAt,
            end_at: endAt,
            status: "pending",
            modalita,
            cliente_note: opts.clienteNote?.trim() || null,
        })
        .returning({ id: appointments.id });

    return { ok: true, appointmentId: inserted.id };
}

/**
 * Lista prenotazioni del cliente (con info type).
 * timeframe: 'upcoming' (default), 'past', 'all'.
 */
export async function listClientAppointments(
    session: ClientSession,
    timeframe: "upcoming" | "past" | "all" = "upcoming"
) {
    const conditions = [eq(appointments.client_id, session.id)];
    if (timeframe === "upcoming") {
        conditions.push(gte(appointments.start_at, new Date()));
    } else if (timeframe === "past") {
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
            type_id: appointment_types.id,
            type_nome: appointment_types.nome,
            type_durata: appointment_types.durata_minuti,
            type_colore: appointment_types.colore_hex,
        })
        .from(appointments)
        .leftJoin(
            appointment_types,
            eq(appointment_types.id, appointments.appointment_type_id)
        )
        .where(and(...conditions))
        .orderBy(
            timeframe === "past"
                ? asc(appointments.start_at)
                : asc(appointments.start_at)
        );

    return rows;
}

/**
 * Cancella una prenotazione lato cliente. Solo se status pending/confirmed
 * e start_at è almeno 4h nel futuro.
 */
export async function cancelBookingByClient(
    session: ClientSession,
    appointmentId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
    const [appt] = await db
        .select()
        .from(appointments)
        .where(
            and(
                eq(appointments.id, appointmentId),
                eq(appointments.client_id, session.id)
            )
        )
        .limit(1);
    if (!appt) return { ok: false, error: "Prenotazione non trovata" };
    if (appt.status !== "pending" && appt.status !== "confirmed") {
        return { ok: false, error: "Non puoi cancellare questa prenotazione" };
    }
    const leadMs = appt.start_at.getTime() - Date.now();
    if (leadMs < 4 * 3600 * 1000) {
        return {
            ok: false,
            error: "Cancellazione possibile fino a 4h prima della sessione",
        };
    }

    await db
        .update(appointments)
        .set({
            status: "cancelled_client",
            cancelled_at: new Date(),
            updated_at: new Date(),
        })
        .where(eq(appointments.id, appointmentId));

    return { ok: true };
}

export { minutesToHHMM };
