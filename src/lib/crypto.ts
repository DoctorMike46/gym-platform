import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Encryption at-rest per colonne PII sensibili (GDPR art.9).
 *
 * Algoritmo: AES-256-GCM
 *   - 12 byte IV random per ogni cifratura
 *   - 16 byte auth tag (integrity check)
 *   - Output formato: `v1:<base64-iv>:<base64-ciphertext+tag>`
 *
 * Il prefisso "v1:" permette future key rotation senza rompere i dati esistenti.
 *
 * KEY MANAGEMENT:
 *   - ENCRYPTION_KEY env: 32 byte random base64 (genera con `openssl rand -base64 32`)
 *   - Backup OBBLIGATORIO: la perdita = perdita irrecuperabile dei dati cifrati
 *   - Stesso valore in dev e prod (altrimenti decifratura fallisce su backup importati)
 */

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
    if (cachedKey) return cachedKey;
    const k = process.env.ENCRYPTION_KEY;
    if (!k) {
        throw new Error("ENCRYPTION_KEY not set — required to read/write PII columns");
    }
    const buf = Buffer.from(k, "base64");
    if (buf.length !== 32) {
        throw new Error(`ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}). Use \`openssl rand -base64 32\` to generate.`);
    }
    cachedKey = buf;
    return buf;
}

/**
 * Cifra una stringa con AES-256-GCM.
 * Ritorna stringa nel formato versionato `v1:<iv-b64>:<payload-b64>`.
 *
 * Non chiamarla con stringhe vuote o null: validare prima a livello chiamante.
 */
export function encryptField(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([enc, tag]).toString("base64");
    return `v1:${iv.toString("base64")}:${payload}`;
}

/**
 * Decifra una stringa precedentemente cifrata con `encryptField`.
 * Lancia se il formato è invalido o l'auth tag non matcha (tampering detected).
 */
export function decryptField(ciphertext: string): string {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) {
        throw new Error("Invalid ciphertext format");
    }
    const [version, ivB64, payloadB64] = parts;
    if (version !== "v1") {
        throw new Error(`Unknown encryption version: ${version}`);
    }
    const iv = Buffer.from(ivB64, "base64");
    const payload = Buffer.from(payloadB64, "base64");
    if (payload.length < 16) {
        throw new Error("Invalid payload: too short for auth tag");
    }
    const tag = payload.subarray(payload.length - 16);
    const enc = payload.subarray(0, payload.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
}

/**
 * Helper: cifra solo se il valore non è null/undefined/stringa vuota.
 * Comodo per campi opzionali del DB.
 */
export function encryptOptional(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value === "") return null;
    return encryptField(value);
}

/**
 * Helper: decifra solo se il valore non è null/undefined/stringa vuota.
 */
export function decryptOptional(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value === "") return null;
    return decryptField(value);
}
