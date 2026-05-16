/**
 * Test E2E H4 sessione B — verifica dual-write + dual-read.
 *
 * 1. Crea cliente fittizio
 * 2. Chiama addClientBodyMeasurement → deve scrivere SIA plain che _enc
 * 3. SELECT raw da DB: conferma colonne plain + enc entrambe popolate
 * 4. Chiama listClientBodyMeasurements → deve ritornare valori decifrati
 * 5. Inserisce un health sample → idem
 * 6. Conferma listClientHealthSamples ritorna value decifrato
 * 7. Cleanup
 */

import "dotenv/config";
import { db } from "../src/db";
import { clients, body_measurements, client_health_samples } from "../src/db/schema";
import { addClientBodyMeasurement, listClientBodyMeasurements } from "../src/lib/services/progress.service";
import { insertHealthSamples, listClientHealthSamples } from "../src/lib/services/health-samples.service";
import { eq, desc } from "drizzle-orm";

async function main() {
    const dbUrl = process.env.DATABASE_URL || "";
    if (dbUrl.includes("ep-flat-tree")) {
        console.error("✗ ABORT: prod host"); process.exit(1);
    }
    if (!process.env.ENCRYPTION_KEY) {
        console.error("✗ ENCRYPTION_KEY non settata"); process.exit(1);
    }

    const stamp = Date.now();
    const [created] = await db.insert(clients).values({
        trainer_id: 3,
        email: `h4-dualio-${stamp}@local.dev`,
        password_hash: "x",
        nome: "H4",
        cognome: "DualIO",
    }).returning({ id: clients.id });
    const cid = created.id;
    console.log(`✓ cliente ${cid}`);

    let fails = 0;
    try {
        // ── BODY MEASUREMENT ──
        console.log("\n[A] addClientBodyMeasurement (dual-write)");
        await addClientBodyMeasurement(
            { id: cid, trainer_id: 3, email: "x" },
            {
                date: "2026-05-17",
                peso_kg: "78.3",
                body_fat_pct: "17.5",
                vita_cm: "82",
                fianchi_cm: "98",
                petto_cm: "102",
                braccio_cm: "36",
                coscia_cm: "58",
                note: "dual-io test",
            },
        );

        const [raw] = await db.select().from(body_measurements).where(eq(body_measurements.client_id, cid)).limit(1);
        console.log("  raw DB:");
        console.log("    peso_kg     =", raw.peso_kg);
        console.log("    peso_kg_enc =", raw.peso_kg_enc?.slice(0, 30) + "...");
        console.log("    coscia_cm   =", raw.coscia_cm);
        console.log("    coscia_cm_enc =", raw.coscia_cm_enc?.slice(0, 30) + "...");

        const allEncPopulated = !!(raw.peso_kg_enc && raw.body_fat_pct_enc && raw.vita_cm_enc &&
            raw.fianchi_cm_enc && raw.petto_cm_enc && raw.braccio_cm_enc && raw.coscia_cm_enc);
        if (!allEncPopulated) { console.error("  ✗ alcuni _enc sono null"); fails++; }
        else console.log("  ✓ tutti i 7 campi _enc popolati");

        console.log("\n[B] listClientBodyMeasurements (dual-read)");
        const list = await listClientBodyMeasurements({ id: cid, trainer_id: 3, email: "x" });
        const m = list[0];
        if (m.peso_kg !== "78.3" || m.coscia_cm !== "58") {
            console.error(`  ✗ valore non corretto: peso_kg=${m.peso_kg} coscia_cm=${m.coscia_cm}`); fails++;
        } else console.log("  ✓ valori restituiti corretti (peso=78.3, coscia=58)");

        // ── HEALTH SAMPLE ──
        console.log("\n[C] insertHealthSamples (dual-write)");
        await insertHealthSamples(cid, [
            { type: "heart_rate_resting", value: "62", unit: "bpm", recorded_at: new Date().toISOString(), source: "manual" },
            { type: "weight", value: "78.3", unit: "kg", recorded_at: new Date().toISOString(), source: "apple_health" },
        ]);

        const rawSamples = await db.select().from(client_health_samples).where(eq(client_health_samples.client_id, cid)).orderBy(desc(client_health_samples.recorded_at));
        console.log(`  raw DB: ${rawSamples.length} sample`);
        for (const s of rawSamples) {
            console.log(`    type=${s.type} value=${s.value} value_enc=${s.value_enc?.slice(0, 30)}...`);
            if (!s.value_enc) { console.error("    ✗ value_enc null"); fails++; }
        }
        if (rawSamples.every(s => !!s.value_enc)) console.log("  ✓ value_enc popolato su tutti");

        console.log("\n[D] listClientHealthSamples (dual-read)");
        const samples = await listClientHealthSamples(cid, 30);
        for (const s of samples) {
            if (s.type === "heart_rate_resting" && s.value !== "62") { console.error(`  ✗ heart_rate value=${s.value}`); fails++; }
            if (s.type === "weight" && s.value !== "78.3") { console.error(`  ✗ weight value=${s.value}`); fails++; }
        }
        if (samples.length === 2) console.log("  ✓ 2 sample restituiti con valori corretti");

        if (fails === 0) console.log("\n✓✓✓ DUAL-WRITE + DUAL-READ funziona end-to-end");
        else console.error(`\n✗✗✗ ${fails} fallimenti`);
    } catch (e) {
        console.error("✗ test errored:", e);
        fails++;
    } finally {
        await db.delete(clients).where(eq(clients.id, cid));
        console.log("  cleanup: cliente cancellato (cascade)");
    }

    process.exit(fails === 0 ? 0 : 1);
}

main();
