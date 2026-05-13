import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Message } from "firebase-admin/messaging";
import { db } from "@/db";
import { client_devices } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Inizializzazione Firebase Admin SDK.
 * Richiede una delle seguenti env:
 *   - FIREBASE_SERVICE_ACCOUNT_JSON: contenuto JSON del service account
 *     (consigliato, single string per .env)
 *   - FIREBASE_SERVICE_ACCOUNT_PATH: path al file .json sul filesystem
 *
 * Se l'env è mancante, le funzioni di questo modulo fanno no-op e logano
 * un warning (così l'app non rompe in dev).
 */

let cachedApp: App | null = null;
let initAttempted = false;

function getFcmApp(): App | null {
    if (cachedApp) return cachedApp;
    if (initAttempted) return null;
    initAttempted = true;

    let serviceAccount: Record<string, unknown> | null = null;
    const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (jsonEnv) {
        try {
            serviceAccount = JSON.parse(jsonEnv) as Record<string, unknown>;
        } catch (e) {
            console.warn("[fcm] FIREBASE_SERVICE_ACCOUNT_JSON non parsabile:", e);
        }
    }
    if (!serviceAccount) {
        const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        if (path) {
            try {
                // require sincrono per non rompere il module loader
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                serviceAccount = require(path) as Record<string, unknown>;
            } catch (e) {
                console.warn("[fcm] Impossibile leggere service account da:", path, e);
            }
        }
    }
    if (!serviceAccount) {
        console.warn(
            "[fcm] Service account non configurato. Push notifiche disabilitate."
        );
        return null;
    }

    const existing = getApps();
    if (existing.length > 0) {
        cachedApp = existing[0];
        return cachedApp;
    }

    try {
        cachedApp = initializeApp({
            credential: cert(serviceAccount as Parameters<typeof cert>[0]),
        });
        return cachedApp;
    } catch (e) {
        console.error("[fcm] Init Firebase Admin fallito:", e);
        return null;
    }
}

export interface FcmPayload {
    title: string;
    body: string;
    /** Dati custom inviati al device (es. { type: 'booking', id: 12 }) per deep-link */
    data?: Record<string, string>;
}

/**
 * Invia una notifica push a tutti i device del cliente.
 * Rimuove i token invalidi dal DB se Firebase risponde 'invalid-argument'/'not-found'.
 * No-op silenzioso se Firebase non è configurato.
 */
export async function sendPushToClient(
    clientId: number,
    payload: FcmPayload
): Promise<{ sent: number; failed: number }> {
    const app = getFcmApp();
    if (!app) return { sent: 0, failed: 0 };

    const devices = await db
        .select({ id: client_devices.id, fcm_token: client_devices.fcm_token })
        .from(client_devices)
        .where(eq(client_devices.client_id, clientId));
    if (devices.length === 0) return { sent: 0, failed: 0 };

    const messaging = getMessaging(app);
    let sent = 0;
    let failed = 0;
    const toDelete: number[] = [];

    await Promise.all(
        devices.map(async (d) => {
            const msg: Message = {
                token: d.fcm_token,
                notification: { title: payload.title, body: payload.body },
                data: payload.data,
                apns: {
                    payload: { aps: { sound: "default" } },
                },
                android: { priority: "high" },
            };
            try {
                await messaging.send(msg);
                sent++;
            } catch (e: unknown) {
                failed++;
                const code = (e as { code?: string })?.code ?? "";
                if (
                    code === "messaging/registration-token-not-registered" ||
                    code === "messaging/invalid-registration-token" ||
                    code === "messaging/invalid-argument"
                ) {
                    toDelete.push(d.id);
                } else {
                    console.warn("[fcm] errore send:", code || e);
                }
            }
        })
    );

    // Cleanup token invalidi
    for (const id of toDelete) {
        await db.delete(client_devices).where(eq(client_devices.id, id));
    }

    return { sent, failed };
}
