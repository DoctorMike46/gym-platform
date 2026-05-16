import { db } from "@/db";
import { body_measurements, progress_photos } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import {
    deleteFromR2,
    generateProgressPhotoKey,
    getR2SignedUrl,
    uploadToR2,
} from "@/lib/r2";
import type { ClientSession } from "@/lib/client-auth";
import { encodeBodyMeasurementInsert, decodeBodyMeasurement } from "@/lib/pii-helpers";

export interface BodyMeasurementInput {
    date: string;
    peso_kg?: string | null;
    body_fat_pct?: string | null;
    vita_cm?: string | null;
    fianchi_cm?: string | null;
    petto_cm?: string | null;
    braccio_cm?: string | null;
    coscia_cm?: string | null;
    note?: string | null;
}

export async function addClientBodyMeasurement(
    session: ClientSession,
    input: BodyMeasurementInput
) {
    await db.insert(body_measurements).values({
        client_id: session.id,
        date: input.date,
        peso_kg: input.peso_kg || null,
        body_fat_pct: input.body_fat_pct || null,
        vita_cm: input.vita_cm || null,
        fianchi_cm: input.fianchi_cm || null,
        petto_cm: input.petto_cm || null,
        braccio_cm: input.braccio_cm || null,
        coscia_cm: input.coscia_cm || null,
        ...encodeBodyMeasurementInsert(input),
        note: input.note || null,
    });
    return { success: true as const };
}

export async function listClientBodyMeasurements(session: ClientSession) {
    const rows = await db
        .select()
        .from(body_measurements)
        .where(eq(body_measurements.client_id, session.id))
        .orderBy(desc(body_measurements.date));
    return rows.map(decodeBodyMeasurement);
}

export async function deleteClientBodyMeasurement(
    session: ClientSession,
    id: number
) {
    await db
        .delete(body_measurements)
        .where(
            and(eq(body_measurements.id, id), eq(body_measurements.client_id, session.id))
        );
    return { success: true as const };
}

export interface UploadProgressPhotoInput {
    file: File;
    type: string;
    date: string;
    note?: string | null;
}

export type UploadProgressPhotoResult =
    | { success: true; key: string; photoId: number }
    | { success: false; error: string };

const ALLOWED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

export async function uploadClientProgressPhoto(
    session: ClientSession,
    input: UploadProgressPhotoInput
): Promise<UploadProgressPhotoResult> {
    if (!input.file) return { success: false, error: "Nessun file ricevuto" };
    if (!ALLOWED_PHOTO_TYPES.includes(input.file.type)) {
        return { success: false, error: "Tipo file non supportato" };
    }
    if (input.file.size > MAX_PHOTO_SIZE_BYTES) {
        return { success: false, error: "File troppo grande (max 10MB)" };
    }

    const buffer = Buffer.from(await input.file.arrayBuffer());
    const key = generateProgressPhotoKey(session.id, input.type, input.file.name);
    await uploadToR2({ key, body: buffer, contentType: input.file.type });

    const [created] = await db
        .insert(progress_photos)
        .values({
            client_id: session.id,
            date: input.date,
            r2_key: key,
            type: input.type,
            note: input.note || null,
        })
        .returning();

    return { success: true, key, photoId: created.id };
}

/**
 * Variante per upload "diretto" (mobile via presign URL): la foto è già su R2,
 * registriamo solo la riga DB.
 */
export async function registerClientProgressPhoto(
    session: ClientSession,
    input: { r2_key: string; type: string; date: string; note?: string | null }
) {
    const [created] = await db
        .insert(progress_photos)
        .values({
            client_id: session.id,
            date: input.date,
            r2_key: input.r2_key,
            type: input.type,
            note: input.note || null,
        })
        .returning();
    return { success: true as const, photoId: created.id };
}

export async function listClientProgressPhotos(session: ClientSession) {
    return db
        .select()
        .from(progress_photos)
        .where(eq(progress_photos.client_id, session.id))
        .orderBy(desc(progress_photos.date));
}

export async function getClientProgressPhotoSignedUrl(
    session: ClientSession,
    photoId: number
): Promise<string> {
    const [photo] = await db
        .select()
        .from(progress_photos)
        .where(
            and(eq(progress_photos.id, photoId), eq(progress_photos.client_id, session.id))
        )
        .limit(1);
    if (!photo) throw new Error("Foto non trovata");
    return getR2SignedUrl(photo.r2_key);
}

export interface WeeklyVolumeBucket {
    week_start: string; // YYYY-MM-DD (lunedì)
    volume: number;
}

export interface MuscleGroupBucket {
    gruppo: string;
    count: number; // numero di esercizi loggati nel periodo
}

export interface ProgressStats {
    weekly_volume: WeeklyVolumeBucket[]; // ultime 8 settimane
    muscle_groups: MuscleGroupBucket[]; // ultimi 30 giorni
}

export async function getClientProgressStats(
    session: ClientSession
): Promise<ProgressStats> {
    // Volume settimanale ultime 8 settimane
    const volumeRows = await db.execute<{ week_start: string; volume: string }>(
        sql`
        WITH weeks AS (
          SELECT generate_series(
            date_trunc('week', CURRENT_DATE - interval '7 weeks'),
            date_trunc('week', CURRENT_DATE),
            '1 week'::interval
          )::date AS week_start
        )
        SELECT
          to_char(w.week_start, 'YYYY-MM-DD') AS week_start,
          COALESCE(
            (
              SELECT SUM(rep::numeric * weight::numeric)
              FROM workout_logs wl
              JOIN workout_exercise_logs wel ON wel.workout_log_id = wl.id
              CROSS JOIN LATERAL UNNEST(
                ARRAY(SELECT jsonb_array_elements(wel.reps_actual)::text::numeric),
                ARRAY(SELECT jsonb_array_elements(wel.weight_actual)::text::numeric)
              ) AS t(rep, weight)
              WHERE wl.client_id = ${session.id}
                AND wl.status = 'completed'
                AND wl.date_executed >= w.week_start
                AND wl.date_executed < w.week_start + interval '1 week'
            ),
            0
          ) AS volume
        FROM weeks w
        ORDER BY w.week_start
        `
    );

    const weekly_volume: WeeklyVolumeBucket[] = (
        (volumeRows as { rows?: Array<{ week_start: string; volume: string }> }).rows ??
        (volumeRows as unknown as Array<{ week_start: string; volume: string }>) ??
        []
    ).map((r) => ({
        week_start: r.week_start,
        volume: Math.round(parseFloat(r.volume ?? "0")),
    }));

    // Gruppi muscolari ultimi 30 giorni (count esercizi loggati)
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const thirtyAgoStr = thirtyAgo.toISOString().slice(0, 10);

    const muscleRows = await db.execute<{ gruppo: string; cnt: string }>(
        sql`
        SELECT
          COALESCE(e.gruppo_muscolare, 'Altro') AS gruppo,
          COUNT(*)::text AS cnt
        FROM workout_logs wl
        JOIN workout_exercise_logs wel ON wel.workout_log_id = wl.id
        JOIN workout_template_exercises te ON te.id = wel.template_exercise_id
        JOIN exercises e ON e.id = te.exercise_id
        WHERE wl.client_id = ${session.id}
          AND wl.status = 'completed'
          AND wl.date_executed >= ${thirtyAgoStr}::date
        GROUP BY e.gruppo_muscolare
        ORDER BY COUNT(*) DESC
        LIMIT 8
        `
    );

    const muscle_groups: MuscleGroupBucket[] = (
        (muscleRows as { rows?: Array<{ gruppo: string; cnt: string }> }).rows ??
        (muscleRows as unknown as Array<{ gruppo: string; cnt: string }>) ??
        []
    ).map((r) => ({
        gruppo: r.gruppo || "Altro",
        count: parseInt(r.cnt ?? "0", 10),
    }));

    return { weekly_volume, muscle_groups };
}

export async function deleteClientProgressPhoto(
    session: ClientSession,
    id: number
): Promise<{ success: true } | { success: false; error: string }> {
    const [photo] = await db
        .select()
        .from(progress_photos)
        .where(
            and(eq(progress_photos.id, id), eq(progress_photos.client_id, session.id))
        )
        .limit(1);
    if (!photo) return { success: false, error: "Foto non trovata" };

    try {
        await deleteFromR2(photo.r2_key);
    } catch (e) {
        console.error("Errore delete R2 (proseguo):", e);
    }
    await db.delete(progress_photos).where(eq(progress_photos.id, id));
    return { success: true };
}
