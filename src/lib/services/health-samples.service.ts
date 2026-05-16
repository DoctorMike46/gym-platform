import { db } from "@/db";
import { client_health_samples } from "@/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";

export type HealthSampleType =
    | "weight"
    | "steps"
    | "heart_rate_resting"
    | "active_energy"
    | "sleep_hours"
    | "workout_minutes";

export type HealthSampleSource = "apple_health" | "health_connect" | "manual";

export const HEALTH_SAMPLE_TYPES: readonly HealthSampleType[] = [
    "weight",
    "steps",
    "heart_rate_resting",
    "active_energy",
    "sleep_hours",
    "workout_minutes",
] as const;

export const HEALTH_SAMPLE_SOURCES: readonly HealthSampleSource[] = [
    "apple_health",
    "health_connect",
    "manual",
] as const;

export interface IncomingSample {
    type: string;
    value: string;
    unit: string;
    recorded_at: string; // ISO
    source: string;
}

export interface StoredSample {
    id: number;
    type: HealthSampleType;
    value: string;
    unit: string;
    recorded_at: string;
    source: HealthSampleSource;
}

/**
 * Inserisce un batch di campioni di salute con dedup automatico.
 * I duplicati (stessa client_id, type, source, recorded_at) vengono ignorati
 * grazie all'unique index.
 */
export async function insertHealthSamples(
    clientId: number,
    samples: IncomingSample[],
): Promise<{ inserted: number }> {
    if (samples.length === 0) return { inserted: 0 };

    const rows = samples
        .filter((s) => {
            const d = new Date(s.recorded_at);
            return (
                HEALTH_SAMPLE_TYPES.includes(s.type as HealthSampleType) &&
                HEALTH_SAMPLE_SOURCES.includes(s.source as HealthSampleSource) &&
                !Number.isNaN(d.getTime()) &&
                s.value !== ""
            );
        })
        .map((s) => ({
            client_id: clientId,
            type: s.type,
            value: s.value,
            unit: s.unit,
            recorded_at: new Date(s.recorded_at),
            source: s.source,
        }));

    if (rows.length === 0) return { inserted: 0 };

    const res = await db
        .insert(client_health_samples)
        .values(rows)
        .onConflictDoNothing({
            target: [
                client_health_samples.client_id,
                client_health_samples.type,
                client_health_samples.source,
                client_health_samples.recorded_at,
            ],
        })
        .returning({ id: client_health_samples.id });

    return { inserted: res.length };
}

/**
 * Ritorna gli ultimi N giorni di campioni per un cliente.
 * Ordinati per recorded_at DESC.
 */
export async function listClientHealthSamples(
    clientId: number,
    days = 30,
    types?: HealthSampleType[],
): Promise<StoredSample[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const filters = [
        eq(client_health_samples.client_id, clientId),
        gte(client_health_samples.recorded_at, since),
    ];
    if (types && types.length > 0) {
        filters.push(
            sql`${client_health_samples.type} IN (${sql.join(
                types.map((t) => sql`${t}`),
                sql`, `,
            )})`,
        );
    }
    const rows = await db
        .select()
        .from(client_health_samples)
        .where(and(...filters))
        .orderBy(desc(client_health_samples.recorded_at))
        .limit(2000);
    return rows.map((r) => ({
        id: r.id,
        type: r.type as HealthSampleType,
        value: r.value,
        unit: r.unit,
        recorded_at: r.recorded_at.toISOString(),
        source: r.source as HealthSampleSource,
    }));
}

/**
 * Ritorna l'ultimo campione per ogni tipo (utile per "snapshot" UI).
 */
export async function listLatestHealthSamples(
    clientId: number,
): Promise<Partial<Record<HealthSampleType, StoredSample>>> {
    const rows = await db
        .select()
        .from(client_health_samples)
        .where(eq(client_health_samples.client_id, clientId))
        .orderBy(desc(client_health_samples.recorded_at))
        .limit(500);

    const latest: Partial<Record<HealthSampleType, StoredSample>> = {};
    for (const r of rows) {
        const t = r.type as HealthSampleType;
        if (latest[t]) continue;
        latest[t] = {
            id: r.id,
            type: t,
            value: r.value,
            unit: r.unit,
            recorded_at: r.recorded_at.toISOString(),
            source: r.source as HealthSampleSource,
        };
    }
    return latest;
}
