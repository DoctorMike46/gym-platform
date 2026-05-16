/**
 * Script di test E2E per il diritto all'oblio (GDPR art. 17).
 *
 * Cosa fa:
 *   1. Crea un cliente fittizio nel DB (branch dev, mai prod)
 *   2. Carica file reali su Cloudflare R2 con path coerenti
 *   3. Inserisce record `progress_photos` + `documents` che puntano alle key R2
 *   4. Verifica via HEAD che i file siano su R2
 *   5. Chiama `deleteClientAccount(testClientId)` — il vero codice prod
 *   6. Verifica che il cliente sia sparito dal DB (cascade)
 *   7. Verifica via HEAD che i file su R2 siano stati rimossi
 *
 * Esce con exit code 0 se tutto OK, 1 se qualcosa è andato male.
 *
 * Sicurezza: rifiuta di girare se DATABASE_URL contiene "ep-flat-tree" (host prod).
 */

import "dotenv/config";
import { Client } from "pg";
import {
    S3Client,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { uploadToR2, generateProgressPhotoKey, generateR2Key } from "../src/lib/r2";
import { db } from "../src/db";
import { clients, progress_photos, documents } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { deleteClientAccount } from "../src/lib/services/account-gdpr.service";

const PROD_HOST_FRAGMENT = "ep-flat-tree";

async function r2Exists(key: string): Promise<boolean> {
    const client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        },
    });
    try {
        await client.send(new HeadObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || "gym-documents",
            Key: key,
        }));
        return true;
    } catch (e) {
        const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
        if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return false;
        throw e;
    }
}

async function main() {
    const dbUrl = process.env.DATABASE_URL || "";
    if (dbUrl.includes(PROD_HOST_FRAGMENT)) {
        console.error("✗ ABORT: DATABASE_URL punta a un host di produzione. Test rifiutato.");
        process.exit(1);
    }
    if (!dbUrl) {
        console.error("✗ DATABASE_URL non settata");
        process.exit(1);
    }

    console.log("→ DB host:", dbUrl.split("@")[1]?.split("/")[0] ?? "?");

    // 1) Creo cliente di test
    const TRAINER_ID = 3;
    const stamp = Date.now();
    const [created] = await db
        .insert(clients)
        .values({
            trainer_id: TRAINER_ID,
            email: `gdpr-test-erasure-${stamp}@local.dev`,
            password_hash: "x",
            nome: "GDPR",
            cognome: "TestErasure",
        })
        .returning({ id: clients.id });
    const testClientId = created.id;
    console.log(`✓ Cliente di test creato: id=${testClientId}`);

    let testFailed = false;
    try {
        // 2) Upload reali su R2
        const photoKey = generateProgressPhotoKey(testClientId, "front", "gdpr-test.txt");
        const docKey = generateR2Key(TRAINER_ID, testClientId, "gdpr-test-doc.txt");

        await uploadToR2({
            key: photoKey,
            body: Buffer.from("GDPR-TEST-ERASURE PHOTO PLACEHOLDER"),
            contentType: "text/plain",
        });
        await uploadToR2({
            key: docKey,
            body: Buffer.from("GDPR-TEST-ERASURE DOC PLACEHOLDER"),
            contentType: "text/plain",
        });
        console.log(`✓ Uploaded R2: ${photoKey}`);
        console.log(`✓ Uploaded R2: ${docKey}`);

        // 3) Inserisco rows DB con le key R2 reali
        await db.insert(progress_photos).values({
            client_id: testClientId,
            date: "2026-01-15",
            r2_key: photoKey,
            type: "front",
            note: "gdpr test erasure",
        });
        await db.insert(documents).values({
            trainer_id: TRAINER_ID,
            client_id: testClientId,
            tipo_documento: "consenso",
            nome_file: "gdpr-test-doc.txt",
            r2_key: docKey,
            mime_type: "text/plain",
            dimensione_bytes: 32,
        });
        console.log("✓ Rows DB inserite (progress_photos, documents)");

        // 4) HEAD prima
        const photoExistsBefore = await r2Exists(photoKey);
        const docExistsBefore = await r2Exists(docKey);
        console.log(`  R2 HEAD prima: photo=${photoExistsBefore} doc=${docExistsBefore}`);
        if (!photoExistsBefore || !docExistsBefore) {
            throw new Error("Upload R2 fallito: HEAD ritorna false anche prima del delete");
        }

        // 5) Chiamo la VERA funzione di cancellazione (codice prod)
        console.log("→ chiamo deleteClientAccount(testClientId)...");
        const result = await deleteClientAccount(testClientId);
        console.log(`✓ deleteClientAccount: deleted=${result.deleted_objects} failed=${result.failed_objects}`);

        // 6) Verifica DB
        const remaining = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, testClientId));
        const photoRemaining = await db.select({ id: progress_photos.id }).from(progress_photos).where(eq(progress_photos.client_id, testClientId));
        const docRemaining = await db.select({ id: documents.id }).from(documents).where(eq(documents.client_id, testClientId));
        console.log(`  DB dopo delete: clients=${remaining.length} photos=${photoRemaining.length} docs=${docRemaining.length}`);
        if (remaining.length !== 0 || photoRemaining.length !== 0 || docRemaining.length !== 0) {
            testFailed = true;
            console.error("✗ DB non pulito completamente");
        }

        // 7) Verifica R2
        const photoExistsAfter = await r2Exists(photoKey);
        const docExistsAfter = await r2Exists(docKey);
        console.log(`  R2 HEAD dopo: photo=${photoExistsAfter} doc=${docExistsAfter}`);
        if (photoExistsAfter || docExistsAfter) {
            testFailed = true;
            console.error("✗ R2 non pulito completamente");
            if (photoExistsAfter) console.error("  residuo:", photoKey);
            if (docExistsAfter) console.error("  residuo:", docKey);
        }

        if (!testFailed) {
            console.log("\n✓✓✓ TEST G4 PASSATO: cascade DB + R2 puliti correttamente");
        } else {
            console.error("\n✗✗✗ TEST G4 FALLITO — vedi log sopra");
        }
    } catch (err) {
        testFailed = true;
        console.error("✗ Errore durante il test:", err);
        // Cleanup best-effort se il cliente è ancora lì
        try {
            await new Client({ connectionString: dbUrl }).connect();
            await db.delete(clients).where(eq(clients.id, testClientId));
            console.log("  cleanup: cliente residuo rimosso dal DB");
        } catch {
            /* ignore */
        }
    }

    process.exit(testFailed ? 1 : 0);
}

main();
