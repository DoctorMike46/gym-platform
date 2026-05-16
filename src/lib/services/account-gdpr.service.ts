import { db } from "@/db";
import {
    clients,
    documents,
    progress_photos,
    chat_messages,
    questionnaire_responses,
    questionnaire_assignments,
    body_measurements,
    workout_logs,
    workout_exercise_logs,
    client_workout_assignments,
    appointments,
    meal_plans,
    meal_plan_meals,
    subscriptions,
    services,
    announcement_recipients,
    client_refresh_tokens,
    client_devices,
    client_password_reset_tokens,
} from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { deleteFromR2 } from "@/lib/r2";
import { decodeBodyMeasurement } from "@/lib/pii-helpers";

/**
 * Aggrega tutti i dati del cliente in un singolo oggetto JSON.
 * Serve l'esercizio del diritto alla portabilità (art. 20 GDPR).
 */
export async function exportClientData(clientId: number) {
    const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

    if (!client) {
        return null;
    }

    const subs = await db
        .select({
            id: subscriptions.id,
            data_inizio: subscriptions.data_inizio,
            data_fine: subscriptions.data_fine,
            status: subscriptions.status,
            service_id: subscriptions.service_id,
            service_nome: services.nome_servizio,
            service_categoria: services.categoria,
            service_prezzo: services.prezzo,
        })
        .from(subscriptions)
        .leftJoin(services, eq(subscriptions.service_id, services.id))
        .where(eq(subscriptions.client_id, clientId));

    const assignments = await db
        .select()
        .from(client_workout_assignments)
        .where(eq(client_workout_assignments.client_id, clientId));

    const logs = await db
        .select()
        .from(workout_logs)
        .where(eq(workout_logs.client_id, clientId));

    const logIds = logs.map((l) => l.id);
    const exerciseLogs =
        logIds.length > 0
            ? await db
                .select()
                .from(workout_exercise_logs)
                .where(inArray(workout_exercise_logs.workout_log_id, logIds))
            : [];

    const measurements = await db
        .select()
        .from(body_measurements)
        .where(eq(body_measurements.client_id, clientId));

    const photos = await db
        .select()
        .from(progress_photos)
        .where(eq(progress_photos.client_id, clientId));

    const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.client_id, clientId));

    const apts = await db
        .select()
        .from(appointments)
        .where(eq(appointments.client_id, clientId));

    const chat = await db
        .select()
        .from(chat_messages)
        .where(eq(chat_messages.client_id, clientId));

    const qAssignments = await db
        .select()
        .from(questionnaire_assignments)
        .where(eq(questionnaire_assignments.client_id, clientId));

    const qIds = qAssignments.map((a) => a.id);
    const qResponses =
        qIds.length > 0
            ? await db
                .select()
                .from(questionnaire_responses)
                .where(inArray(questionnaire_responses.assignment_id, qIds))
            : [];

    const plans = await db
        .select()
        .from(meal_plans)
        .where(eq(meal_plans.client_id, clientId));

    const planIds = plans.map((p) => p.id);
    const meals =
        planIds.length > 0
            ? await db
                .select()
                .from(meal_plan_meals)
                .where(inArray(meal_plan_meals.meal_plan_id, planIds))
            : [];

    return {
        exported_at: new Date().toISOString(),
        format_version: 1,
        notice:
            "Questo è un export integrale dei tuoi dati personali ai sensi dell'art. 20 GDPR. Conservalo in luogo sicuro.",
        profile: {
            id: client.id,
            nome: client.nome,
            cognome: client.cognome,
            email: client.email,
            telefono: client.telefono,
            peso: client.peso,
            altezza: client.altezza,
            eta: client.eta,
            data_di_nascita: client.data_di_nascita,
            anamnesi_status: client.anamnesi_status,
            created_at: client.created_at,
            consents: {
                terms_accepted_at: client.portal_terms_accepted_at,
                privacy_accepted_at: client.privacy_accepted_at,
                health_data_consent_at: client.health_data_consent_at,
                marketing_consent_at: client.marketing_consent_at,
            },
        },
        subscriptions: subs,
        workout_assignments: assignments,
        workout_logs: logs.map((l) => ({
            ...l,
            exercise_logs: exerciseLogs.filter(
                (e) => e.workout_log_id === l.id
            ),
        })),
        body_measurements: measurements.map(decodeBodyMeasurement),
        progress_photos: photos.map((p) => ({
            ...p,
            note: "Il file binario non è incluso. Usa la funzione 'Documenti' nell'app per scaricare le foto prima della cancellazione.",
        })),
        documents: docs.map((d) => ({
            ...d,
            note: "Il file binario non è incluso nell'export. Scaricalo dall'app prima dell'eventuale cancellazione.",
        })),
        appointments: apts,
        chat_messages: chat,
        questionnaires: qAssignments.map((a) => ({
            assignment: a,
            response:
                qResponses.find((r) => r.assignment_id === a.id) ?? null,
        })),
        meal_plans: plans.map((p) => ({
            ...p,
            meals: meals.filter((m) => m.meal_plan_id === p.id),
        })),
    };
}

/**
 * Cancella in modo definitivo l'account cliente e tutti i dati personali
 * collegati. Le tabelle con FK `onDelete: cascade` verranno svuotate dal DB,
 * ma dobbiamo prima:
 *   1) raccogliere tutte le R2 key (documents, progress_photos, chat
 *      attachments) e cancellare gli oggetti su Cloudflare R2
 *   2) revocare i token (refresh + reset) e i device FCM
 *   3) eliminare la riga clients (cascata)
 *
 * Lasciamo intenzionalmente:
 *  - i workout_logs aggregati anonimizzati? No, vanno via per cascade.
 *  - eventuali fatture/documenti contabili: il trainer ha l'obbligo di
 *    conservazione 10 anni (art. 2220 c.c.), per ora vengono cancellati
 *    anche quelli. In una revisione futura va aggiunto un flag `is_billing`
 *    per preservarli separatamente.
 */
export async function deleteClientAccount(clientId: number): Promise<{
    deleted_objects: number;
    failed_objects: number;
}> {
    // 1) Raccogli R2 keys
    const r2Keys: string[] = [];

    const docs = await db
        .select({ key: documents.r2_key })
        .from(documents)
        .where(eq(documents.client_id, clientId));
    docs.forEach((d) => d.key && r2Keys.push(d.key));

    const photos = await db
        .select({ key: progress_photos.r2_key })
        .from(progress_photos)
        .where(eq(progress_photos.client_id, clientId));
    photos.forEach((p) => p.key && r2Keys.push(p.key));

    const chatAtts = await db
        .select({ key: chat_messages.attachment_r2_key })
        .from(chat_messages)
        .where(eq(chat_messages.client_id, clientId));
    chatAtts.forEach((c) => c.key && r2Keys.push(c.key));

    // R2 keys delle risposte ai questionari con upload
    const qResps = await db
        .select({
            response_json: questionnaire_responses.response_json,
        })
        .from(questionnaire_responses)
        .innerJoin(
            questionnaire_assignments,
            eq(
                questionnaire_responses.assignment_id,
                questionnaire_assignments.id
            )
        )
        .where(eq(questionnaire_assignments.client_id, clientId));

    for (const r of qResps) {
        const obj = r.response_json as Record<string, unknown> | null;
        if (!obj) continue;
        for (const v of Object.values(obj)) {
            if (
                typeof v === "string" &&
                v.startsWith(`clients/${clientId}/questionnaires/`)
            ) {
                r2Keys.push(v);
            }
        }
    }

    // 2) Cancella oggetti R2 (best-effort, non blocca la cancellazione DB)
    let deletedObjects = 0;
    let failedObjects = 0;
    await Promise.all(
        r2Keys.map(async (key) => {
            try {
                await deleteFromR2(key);
                deletedObjects++;
            } catch (e) {
                failedObjects++;
                console.error("[gdpr-delete] R2 delete failed", key, e);
            }
        })
    );

    // 3) Revoca tutti i token e devices (cascade farebbe la stessa cosa,
    // ma essendo dati molto sensibili li azzeriamo esplicitamente prima)
    await db
        .delete(client_refresh_tokens)
        .where(eq(client_refresh_tokens.client_id, clientId));
    await db
        .delete(client_devices)
        .where(eq(client_devices.client_id, clientId));
    await db
        .delete(client_password_reset_tokens)
        .where(eq(client_password_reset_tokens.client_id, clientId));

    // 4) Annunci-recipient (la FK è già cascade ma esplicitiamo l'intento)
    await db
        .delete(announcement_recipients)
        .where(eq(announcement_recipients.client_id, clientId));

    // 5) DELETE FINALE — cascade sulle altre tabelle
    await db.delete(clients).where(eq(clients.id, clientId));

    return { deleted_objects: deletedObjects, failed_objects: failedObjects };
}

/**
 * Aggiorna i consensi del cliente (revoca / concessione).
 * Per ora gestiamo health & marketing. Privacy e Terms sono irrevocabili
 * senza cancellazione dell'account (se revochi privacy non puoi più usare
 * il servizio).
 */
export async function updateClientConsents(
    clientId: number,
    consents: { marketing?: boolean }
): Promise<void> {
    const updates: Record<string, Date | null> = {};
    if (typeof consents.marketing === "boolean") {
        updates.marketing_consent_at = consents.marketing ? new Date() : null;
    }
    if (Object.keys(updates).length === 0) return;
    await db
        .update(clients)
        .set({ ...updates, updated_at: sql`now()` })
        .where(eq(clients.id, clientId));
}
