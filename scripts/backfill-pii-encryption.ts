/**
 * Backfill H4 — cifra i valori PII esistenti nelle colonne shadow `*_enc`.
 *
 * Scope:
 *   - body_measurements: peso_kg, body_fat_pct, vita_cm, fianchi_cm,
 *     petto_cm, braccio_cm, coscia_cm
 *   - client_health_samples: value
 *
 * Idempotente: salta i record che hanno già il valore _enc popolato.
 *
 * Sicurezza:
 *   - ENCRYPTION_KEY DEVE essere settata
 *   - Verifica integrità: dopo l'update, ricarica un sample e confronta
 *     plain == decrypt(enc). Se differisce → abort + report.
 *   - Non droppa le colonne plain (sessione B).
 */

import "dotenv/config";
import { db } from "../src/db";
import { body_measurements, client_health_samples } from "../src/db/schema";
import { encryptOptional, decryptField } from "../src/lib/crypto";
import { eq, and, isNull, isNotNull, or } from "drizzle-orm";

async function backfillBodyMeasurements() {
    console.log("\n→ body_measurements: cerco record con plain != null e _enc == null");
    const cols = [
        "peso_kg", "body_fat_pct", "vita_cm", "fianchi_cm",
        "petto_cm", "braccio_cm", "coscia_cm",
    ] as const;

    const rows = await db
        .select()
        .from(body_measurements)
        .where(
            or(
                and(isNotNull(body_measurements.peso_kg), isNull(body_measurements.peso_kg_enc)),
                and(isNotNull(body_measurements.body_fat_pct), isNull(body_measurements.body_fat_pct_enc)),
                and(isNotNull(body_measurements.vita_cm), isNull(body_measurements.vita_cm_enc)),
                and(isNotNull(body_measurements.fianchi_cm), isNull(body_measurements.fianchi_cm_enc)),
                and(isNotNull(body_measurements.petto_cm), isNull(body_measurements.petto_cm_enc)),
                and(isNotNull(body_measurements.braccio_cm), isNull(body_measurements.braccio_cm_enc)),
                and(isNotNull(body_measurements.coscia_cm), isNull(body_measurements.coscia_cm_enc)),
            ),
        );

    console.log(`  trovati ${rows.length} record da backfillare`);
    let processed = 0;

    for (const row of rows) {
        const updates: Record<string, string | null> = {};
        for (const c of cols) {
            const plainVal = row[c];
            const encKey = `${c}_enc` as const;
            const encVal = row[encKey];
            if (plainVal && !encVal) {
                updates[encKey] = encryptOptional(plainVal);
            }
        }
        if (Object.keys(updates).length === 0) continue;
        await db.update(body_measurements).set(updates).where(eq(body_measurements.id, row.id));
        processed++;
    }

    console.log(`  ✓ aggiornati ${processed} record body_measurements`);
    return processed;
}

async function backfillHealthSamples() {
    console.log("\n→ client_health_samples: cerco record con value e value_enc == null");
    const rows = await db
        .select({ id: client_health_samples.id, value: client_health_samples.value })
        .from(client_health_samples)
        .where(isNull(client_health_samples.value_enc));

    console.log(`  trovati ${rows.length} record da backfillare`);
    let processed = 0;

    for (const row of rows) {
        if (!row.value) continue;
        await db
            .update(client_health_samples)
            .set({ value_enc: encryptOptional(row.value) })
            .where(eq(client_health_samples.id, row.id));
        processed++;
    }

    console.log(`  ✓ aggiornati ${processed} record client_health_samples`);
    return processed;
}

async function verifyIntegrity() {
    console.log("\n→ verifica integrità (decrypt round-trip su sample)");

    const bm = await db
        .select()
        .from(body_measurements)
        .where(and(isNotNull(body_measurements.peso_kg), isNotNull(body_measurements.peso_kg_enc)))
        .limit(5);

    let failures = 0;
    for (const r of bm) {
        try {
            const dec = decryptField(r.peso_kg_enc!);
            if (dec !== r.peso_kg) {
                console.error(`  ✗ mismatch body_measurements.id=${r.id}: plain="${r.peso_kg}" decrypt="${dec}"`);
                failures++;
            }
        } catch (e) {
            console.error(`  ✗ decrypt fallita body_measurements.id=${r.id}:`, e);
            failures++;
        }
    }

    const hs = await db
        .select()
        .from(client_health_samples)
        .where(isNotNull(client_health_samples.value_enc))
        .limit(5);

    for (const r of hs) {
        try {
            const dec = decryptField(r.value_enc!);
            if (dec !== r.value) {
                console.error(`  ✗ mismatch client_health_samples.id=${r.id}: plain="${r.value}" decrypt="${dec}"`);
                failures++;
            }
        } catch (e) {
            console.error(`  ✗ decrypt fallita client_health_samples.id=${r.id}:`, e);
            failures++;
        }
    }

    if (failures === 0) {
        console.log(`  ✓ tutti i ${bm.length + hs.length} sample decrittano correttamente`);
    } else {
        console.error(`  ✗ ${failures} fallimenti su ${bm.length + hs.length} sample`);
    }
    return failures;
}

async function main() {
    const dbUrl = process.env.DATABASE_URL || "";
    if (!dbUrl) {
        console.error("✗ DATABASE_URL non settata");
        process.exit(1);
    }
    if (!process.env.ENCRYPTION_KEY) {
        console.error("✗ ENCRYPTION_KEY non settata. Genera con: openssl rand -base64 32");
        process.exit(1);
    }
    console.log("→ DB host:", dbUrl.split("@")[1]?.split("/")[0] ?? "?");

    const bm = await backfillBodyMeasurements();
    const hs = await backfillHealthSamples();
    const failures = await verifyIntegrity();

    console.log(`\n=== RIEPILOGO ===`);
    console.log(`  body_measurements:     ${bm} cifrate`);
    console.log(`  client_health_samples: ${hs} cifrate`);
    console.log(`  verifica integrità:    ${failures === 0 ? "OK" : `${failures} FALLITE`}`);

    process.exit(failures === 0 ? 0 : 1);
}

main();
