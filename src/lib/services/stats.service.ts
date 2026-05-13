import { db } from "@/db";
import {
    body_measurements,
    client_workout_assignments,
    workout_logs,
    workout_templates,
} from "@/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { ClientSession } from "@/lib/client-auth";

export interface ClientStats {
    /** Numero allenamenti completati negli ultimi 7 giorni */
    workouts_this_week: number;
    /** Numero allenamenti completati negli ultimi 30 giorni */
    workouts_this_month: number;
    /** Streak: numero di giorni consecutivi con almeno un workout completed (terminato oggi o ieri) */
    streak_days: number;
    /** Peso più recente (kg) dalla tabella body_measurements */
    last_weight_kg: number | null;
    /** Data della rilevazione del peso */
    last_weight_date: string | null;
    /** Differenza peso ultimi 30 giorni (kg, può essere negativa) */
    weight_change_30d: number | null;
    /** Volume totale (somma reps × peso) ultimi 7 giorni */
    volume_this_week: number;
    /** Schede attive (assignments con attivo=true) */
    active_assignments: number;
    /** Split settimanale (giorni/sett) della prima scheda attiva, null se nessuna */
    weekly_split_target: number | null;
    /** Date YYYY-MM-DD (distinte) dei workout completed negli ultimi 7 giorni */
    weekly_workout_dates: string[];
    /** Prossimo allenamento suggerito (assignment_id, giorno) basato sull'ultimo log */
    next_suggested: { assignment_id: number; giorno: number } | null;
}

export async function getClientStats(session: ClientSession): Promise<ClientStats> {
    const now = new Date();
    const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Allenamenti recenti (completed)
    const completedRows = await db
        .select({
            id: workout_logs.id,
            assignment_id: workout_logs.assignment_id,
            giorno: workout_logs.giorno,
            date_executed: workout_logs.date_executed,
        })
        .from(workout_logs)
        .where(
            and(
                eq(workout_logs.client_id, session.id),
                eq(workout_logs.status, "completed"),
                gte(workout_logs.date_executed, thirtyAgo.toISOString().slice(0, 10))
            )
        )
        .orderBy(desc(workout_logs.date_executed));

    const sevenAgoStr = sevenAgo.toISOString().slice(0, 10);
    const completedLast7 = completedRows.filter(
        (r) => r.date_executed >= sevenAgoStr
    );
    const workouts_this_week = completedLast7.length;
    const workouts_this_month = completedRows.length;
    const weekly_workout_dates = Array.from(
        new Set(completedLast7.map((r) => r.date_executed))
    );

    // Streak: giorni consecutivi con almeno un workout completed, terminando oggi o ieri
    const datesSet = new Set(completedRows.map((r) => r.date_executed));
    let streak = 0;
    let cursor = new Date(now);
    cursor.setHours(0, 0, 0, 0);
    // Se non c'è oggi, parti da ieri (l'utente ancora non ha allenato oggi ma la streak può essere viva)
    const today = cursor.toISOString().slice(0, 10);
    if (!datesSet.has(today)) {
        cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    }
    while (datesSet.has(cursor.toISOString().slice(0, 10))) {
        streak++;
        cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    }

    // Peso più recente + delta 30gg
    const recentWeightRows = await db
        .select({
            date: body_measurements.date,
            peso_kg: body_measurements.peso_kg,
        })
        .from(body_measurements)
        .where(eq(body_measurements.client_id, session.id))
        .orderBy(desc(body_measurements.date))
        .limit(60);

    const weightsParsed = recentWeightRows
        .map((r) => ({
            date: r.date,
            kg: r.peso_kg ? parseFloat(r.peso_kg.replace(",", ".")) : null,
        }))
        .filter((r): r is { date: string; kg: number } => r.kg !== null && !Number.isNaN(r.kg));

    const last_weight_kg = weightsParsed[0]?.kg ?? null;
    const last_weight_date = weightsParsed[0]?.date ?? null;

    let weight_change_30d: number | null = null;
    if (weightsParsed.length >= 2) {
        const oldRef = weightsParsed.find((w) => w.date <= thirtyAgo.toISOString().slice(0, 10));
        if (oldRef) {
            weight_change_30d = +(weightsParsed[0].kg - oldRef.kg).toFixed(1);
        } else {
            // Se non abbiamo un punto a 30gg, prendiamo il più vecchio disponibile entro la finestra
            const oldest = weightsParsed[weightsParsed.length - 1];
            weight_change_30d = +(weightsParsed[0].kg - oldest.kg).toFixed(1);
        }
    }

    // Volume settimanale (sum reps_actual * weight_actual su workout_exercise_logs degli ultimi 7gg)
    // Usiamo SQL con jsonb_array_elements per sommare gli array
    const volumeRow = await db.execute(
        sql`SELECT COALESCE(SUM(rep::numeric * weight::numeric), 0) AS volume
            FROM workout_logs wl
            JOIN workout_exercise_logs wel ON wel.workout_log_id = wl.id
            CROSS JOIN LATERAL UNNEST(
              ARRAY(SELECT jsonb_array_elements(wel.reps_actual)::text::numeric),
              ARRAY(SELECT jsonb_array_elements(wel.weight_actual)::text::numeric)
            ) AS t(rep, weight)
            WHERE wl.client_id = ${session.id}
              AND wl.status = 'completed'
              AND wl.date_executed >= ${sevenAgoStr}::date`
    );
    let volume_this_week = 0;
    const firstRow = (volumeRow as { rows?: Array<{ volume?: unknown }> }).rows?.[0]
        ?? (volumeRow as unknown as Array<{ volume?: unknown }>)[0];
    if (firstRow && firstRow.volume != null) {
        const v = typeof firstRow.volume === "string"
            ? parseFloat(firstRow.volume)
            : Number(firstRow.volume);
        volume_this_week = Math.round(Number.isFinite(v) ? v : 0);
    }

    // Schede attive (con split settimanale dal template)
    const activeAssign = await db
        .select({
            id: client_workout_assignments.id,
            split_settimanale: workout_templates.split_settimanale,
        })
        .from(client_workout_assignments)
        .leftJoin(
            workout_templates,
            eq(workout_templates.id, client_workout_assignments.template_id)
        )
        .where(
            and(
                eq(client_workout_assignments.client_id, session.id),
                eq(client_workout_assignments.attivo, true)
            )
        );
    const active_assignments = activeAssign.length;
    const weekly_split_target = activeAssign[0]?.split_settimanale ?? null;

    // Prossimo suggerito = assignment dell'ultimo log + giorno+1 (modulo split)
    let next_suggested: ClientStats["next_suggested"] = null;
    if (completedRows[0]?.assignment_id != null) {
        const lastGiorno = completedRows[0].giorno ?? 1;
        next_suggested = {
            assignment_id: completedRows[0].assignment_id,
            giorno: lastGiorno + 1, // il client può fare il modulo se vuole
        };
    } else if (activeAssign.length > 0) {
        next_suggested = { assignment_id: activeAssign[0].id, giorno: 1 };
    }

    return {
        workouts_this_week,
        workouts_this_month,
        streak_days: streak,
        last_weight_kg,
        last_weight_date,
        weight_change_30d,
        volume_this_week,
        active_assignments,
        weekly_split_target,
        weekly_workout_dates,
        next_suggested,
    };
}
