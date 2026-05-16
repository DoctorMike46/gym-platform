/**
 * Helper per dual-write/dual-read sulle colonne PII cifrate (H4 sessione B).
 *
 * Strategia transitoria:
 *   - Su INSERT: scrivo SIA plain che _enc. Il codice consumer continua a
 *     leggere dalle plain finché tutti i record non sono backfillati.
 *   - Su SELECT: leggo prima _enc (decifro), fallback a plain. Permette
 *     compatibilità con record vecchi non ancora backfillati.
 *
 * Quando tutti i record avranno _enc popolato, una sessione futura
 * rimuoverà la lettura plain e dropperà le colonne plain dal DB.
 */

import { encryptOptional, decryptOptional } from "@/lib/crypto";

const BODY_MEASUREMENT_FIELDS = [
    "peso_kg",
    "body_fat_pct",
    "vita_cm",
    "fianchi_cm",
    "petto_cm",
    "braccio_cm",
    "coscia_cm",
] as const;

type BodyMeasurementField = typeof BODY_MEASUREMENT_FIELDS[number];

/**
 * Restituisce la versione decifrata se `enc` è valorizzato e decryptabile,
 * altrimenti il valore plain. Non lancia mai: in caso di decrypt fallita
 * logga warn e ritorna il plain (fallback graceful).
 */
export function preferDecrypted(plain: string | null, enc: string | null | undefined): string | null {
    if (enc) {
        try {
            return decryptOptional(enc);
        } catch (e) {
            console.warn("[pii-helpers] decrypt failed, fallback to plain:", e);
        }
    }
    return plain;
}

/**
 * Trasforma una row di body_measurements sostituendo i campi PII con la
 * versione "preferita" (decifrata se possibile, altrimenti plain).
 * Le colonne `*_enc` restano nella row per debug/visibilità.
 */
export function decodeBodyMeasurement<T extends Record<string, unknown>>(row: T): T {
    const result = { ...row } as Record<string, unknown>;
    for (const f of BODY_MEASUREMENT_FIELDS) {
        const plain = (row[f] as string | null) ?? null;
        const enc = (row[`${f}_enc`] as string | null | undefined) ?? null;
        result[f] = preferDecrypted(plain, enc);
    }
    return result as T;
}

/**
 * Da usare insieme alle plain in db.insert(body_measurements).values({...}).
 * Esempio:
 *   await db.insert(body_measurements).values({
 *       client_id,
 *       peso_kg: input.peso_kg,
 *       ...encodeBodyMeasurementInsert(input),
 *   });
 */
export function encodeBodyMeasurementInsert(input: {
    peso_kg?: string | null;
    body_fat_pct?: string | null;
    vita_cm?: string | null;
    fianchi_cm?: string | null;
    petto_cm?: string | null;
    braccio_cm?: string | null;
    coscia_cm?: string | null;
}): Partial<Record<`${BodyMeasurementField}_enc`, string | null>> {
    return {
        peso_kg_enc: encryptOptional(input.peso_kg ?? null),
        body_fat_pct_enc: encryptOptional(input.body_fat_pct ?? null),
        vita_cm_enc: encryptOptional(input.vita_cm ?? null),
        fianchi_cm_enc: encryptOptional(input.fianchi_cm ?? null),
        petto_cm_enc: encryptOptional(input.petto_cm ?? null),
        braccio_cm_enc: encryptOptional(input.braccio_cm ?? null),
        coscia_cm_enc: encryptOptional(input.coscia_cm ?? null),
    };
}

/**
 * Trasforma una row di client_health_samples sostituendo `value` con la
 * versione "preferita" (decifrata se possibile).
 */
export function decodeHealthSample<T extends { value: string; value_enc: string | null }>(row: T): T {
    return {
        ...row,
        value: preferDecrypted(row.value, row.value_enc) ?? row.value,
    };
}

/**
 * Ritorna `{ value_enc }` da fondere nel values() di db.insert(client_health_samples).
 */
export function encodeHealthSampleValue(value: string): { value_enc: string | null } {
    return {
        value_enc: encryptOptional(value),
    };
}
