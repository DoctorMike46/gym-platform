import "server-only";

import { db } from "@/db";
import {
    chat_messages,
    clients,
    meal_plans,
    nutrition_requests,
} from "@/db/schema";
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { decryptOptional, encryptOptional } from "@/lib/crypto";
import { logAudit, type AuditActor } from "@/lib/audit-log";
import { OBIETTIVI } from "./nutrition-requests.types";
import type {
    CreateRequestInput,
    ListRequestsFilters,
    NutritionRequest,
    NutritionRequestListItem,
    NutritionRequestStatus,
    Obiettivo,
} from "./nutrition-requests.types";

function safeDecrypt(value: string | null | undefined): string | null {
    try {
        return decryptOptional(value);
    } catch (err) {
        console.error("[nutrition-requests] decrypt failed", { err });
        return null;
    }
}

function mapRow(row: typeof nutrition_requests.$inferSelect): NutritionRequest {
    return {
        id: row.id,
        client_id: row.client_id,
        trainer_id: row.trainer_id,
        status: row.status as NutritionRequestStatus,
        obiettivo: row.obiettivo as Obiettivo | null,
        timeframe_settimane: row.timeframe_settimane,
        peso_target_kg: safeDecrypt(row.peso_target_kg_enc),
        motivazione: row.motivazione,
        regime_alimentare: row.regime_alimentare,
        allergeni: (row.allergeni as string[] | null) ?? null,
        intolleranze: (row.intolleranze as string[] | null) ?? null,
        cibi_preferiti: (row.cibi_preferiti as string[] | null) ?? null,
        cibi_evitati: (row.cibi_evitati as string[] | null) ?? null,
        n_pasti_die: row.n_pasti_die,
        orari_pasti: (row.orari_pasti as string[] | null) ?? null,
        occasioni_sociali: row.occasioni_sociali,
        ore_sonno: row.ore_sonno,
        livello_stress: row.livello_stress,
        consumo_acqua_litri: safeDecrypt(row.consumo_acqua_litri_enc),
        fumo: row.fumo,
        integratori:
            (row.integratori as Array<{ nome: string; dosaggio?: string | null }> | null) ?? null,
        patologie: safeDecrypt(row.patologie_enc),
        farmaci: safeDecrypt(row.farmaci_enc),
        note_libere: safeDecrypt(row.note_libere_enc),
        trainer_decline_reason: row.trainer_decline_reason,
        trainer_internal_note: row.trainer_internal_note,
        linked_meal_plan_id: row.linked_meal_plan_id,
        requested_at: row.requested_at,
        reviewed_at: row.reviewed_at,
        decided_at: row.decided_at,
    };
}

/**
 * Crea una richiesta da app mobile cliente. Salva snapshot cifrato dei campi art.9
 * e accoda un messaggio in chat al trainer come notifica.
 *
 * Vieta la creazione se esiste già una richiesta pending o in_review.
 */
export async function createNutritionRequest(
    clientId: number,
    trainerId: number,
    input: CreateRequestInput,
    actor: AuditActor
): Promise<NutritionRequest> {
    if (!OBIETTIVI.includes(input.obiettivo)) {
        throw new Error("invalid_obiettivo");
    }

    const [existing] = await db
        .select({ id: nutrition_requests.id, status: nutrition_requests.status })
        .from(nutrition_requests)
        .where(
            and(
                eq(nutrition_requests.client_id, clientId),
                inArray(nutrition_requests.status, ["pending", "in_review"])
            )
        )
        .limit(1);

    if (existing) {
        throw new Error("request_already_active");
    }

    const [client] = await db
        .select({ nome: clients.nome, cognome: clients.cognome })
        .from(clients)
        .where(
            and(
                eq(clients.id, clientId),
                eq(clients.trainer_id, trainerId),
                isNull(clients.deleted_at)
            )
        )
        .limit(1);
    if (!client) throw new Error("client_not_found_or_not_owned");

    const [row] = await db
        .insert(nutrition_requests)
        .values({
            client_id: clientId,
            trainer_id: trainerId,
            status: "pending",
            obiettivo: input.obiettivo,
            timeframe_settimane: input.timeframe_settimane ?? null,
            peso_target_kg_enc: encryptOptional(input.peso_target_kg ?? null),
            motivazione: input.motivazione ?? null,
            regime_alimentare: input.regime_alimentare ?? null,
            allergeni: input.allergeni ?? null,
            intolleranze: input.intolleranze ?? null,
            cibi_preferiti: input.cibi_preferiti ?? null,
            cibi_evitati: input.cibi_evitati ?? null,
            n_pasti_die: input.n_pasti_die ?? null,
            orari_pasti: input.orari_pasti ?? null,
            occasioni_sociali: input.occasioni_sociali ?? null,
            ore_sonno: input.ore_sonno ?? null,
            livello_stress: input.livello_stress ?? null,
            consumo_acqua_litri_enc: encryptOptional(input.consumo_acqua_litri ?? null),
            fumo: input.fumo ?? null,
            integratori: input.integratori ?? null,
            patologie_enc: encryptOptional(input.patologie ?? null),
            farmaci_enc: encryptOptional(input.farmaci ?? null),
            note_libere_enc: encryptOptional(input.note_libere ?? null),
        })
        .returning();

    // Notifica trainer via chat — messaggio dal client (semantica corretta:
    // il cliente sta chiedendo qualcosa al trainer).
    try {
        await db.insert(chat_messages).values({
            trainer_id: trainerId,
            client_id: clientId,
            sender_role: "client",
            body: "📋 Ho inviato una richiesta di piano alimentare. Puoi vederla in Nutrizione › Richieste.",
        });
    } catch (err) {
        console.error("[nutrition-requests] chat notification failed", { id: row.id, err });
    }

    await logAudit({
        actor,
        action: "nutrition_request.create",
        resourceType: "nutrition_requests",
        resourceId: row.id,
        clientId,
        metadata: { obiettivo: input.obiettivo },
    });

    return mapRow(row);
}

/**
 * Ritorna la richiesta attiva (pending o in_review) più recente del cliente, se esiste.
 */
export async function getActiveRequestForClient(
    clientId: number
): Promise<NutritionRequest | null> {
    const [row] = await db
        .select()
        .from(nutrition_requests)
        .where(
            and(
                eq(nutrition_requests.client_id, clientId),
                inArray(nutrition_requests.status, ["pending", "in_review"])
            )
        )
        .orderBy(desc(nutrition_requests.requested_at))
        .limit(1);
    return row ? mapRow(row) : null;
}

/**
 * Dettaglio richiesta. Audita read (art.9 — snapshot contiene dati medici).
 */
export async function getRequestById(
    id: number,
    actor: AuditActor,
    opts: { trainerId?: number; clientId?: number } = {}
): Promise<NutritionRequest | null> {
    const conds = [eq(nutrition_requests.id, id)];
    if (opts.trainerId !== undefined) conds.push(eq(nutrition_requests.trainer_id, opts.trainerId));
    if (opts.clientId !== undefined) conds.push(eq(nutrition_requests.client_id, opts.clientId));

    const [row] = await db.select().from(nutrition_requests).where(and(...conds)).limit(1);
    if (!row) return null;

    await logAudit({
        actor,
        action: "nutrition_request.read",
        resourceType: "nutrition_requests",
        resourceId: row.id,
        clientId: row.client_id,
    });

    return mapRow(row);
}

export async function listRequestsForTrainer(
    trainerId: number,
    filters: ListRequestsFilters = {}
): Promise<NutritionRequestListItem[]> {
    const conds = [eq(nutrition_requests.trainer_id, trainerId)];
    if (filters.status) conds.push(eq(nutrition_requests.status, filters.status));
    if (filters.clientId) conds.push(eq(nutrition_requests.client_id, filters.clientId));
    if (filters.fromDate) conds.push(gte(nutrition_requests.requested_at, filters.fromDate));
    if (filters.toDate) conds.push(lte(nutrition_requests.requested_at, filters.toDate));

    const rows = await db
        .select({
            id: nutrition_requests.id,
            client_id: nutrition_requests.client_id,
            client_nome: clients.nome,
            client_cognome: clients.cognome,
            status: nutrition_requests.status,
            obiettivo: nutrition_requests.obiettivo,
            timeframe_settimane: nutrition_requests.timeframe_settimane,
            requested_at: nutrition_requests.requested_at,
            decided_at: nutrition_requests.decided_at,
        })
        .from(nutrition_requests)
        .innerJoin(clients, eq(clients.id, nutrition_requests.client_id))
        .where(and(...conds))
        .orderBy(desc(nutrition_requests.requested_at));

    return rows.map((r) => ({
        id: r.id,
        client_id: r.client_id,
        client_nome: r.client_nome,
        client_cognome: r.client_cognome,
        status: r.status as NutritionRequestStatus,
        obiettivo: r.obiettivo as Obiettivo | null,
        timeframe_settimane: r.timeframe_settimane,
        requested_at: r.requested_at,
        decided_at: r.decided_at,
    }));
}

export async function countPendingRequestsForTrainer(trainerId: number): Promise<number> {
    const rows = await db
        .select({ id: nutrition_requests.id })
        .from(nutrition_requests)
        .where(
            and(
                eq(nutrition_requests.trainer_id, trainerId),
                eq(nutrition_requests.status, "pending")
            )
        );
    return rows.length;
}

export async function markRequestInReview(
    id: number,
    trainerId: number,
    note: string | null,
    actor: AuditActor
): Promise<NutritionRequest> {
    const [row] = await db
        .update(nutrition_requests)
        .set({
            status: "in_review",
            reviewed_at: new Date(),
            trainer_internal_note: note,
        })
        .where(
            and(
                eq(nutrition_requests.id, id),
                eq(nutrition_requests.trainer_id, trainerId),
                eq(nutrition_requests.status, "pending")
            )
        )
        .returning();

    if (!row) throw new Error("request_not_pending");

    await logAudit({
        actor,
        action: "nutrition_request.decide",
        resourceType: "nutrition_requests",
        resourceId: row.id,
        clientId: row.client_id,
        metadata: { transition: "in_review" },
    });

    return mapRow(row);
}

export async function declineRequest(
    id: number,
    trainerId: number,
    reason: string,
    actor: AuditActor
): Promise<NutritionRequest> {
    if (!reason || reason.trim().length === 0) {
        throw new Error("decline_reason_required");
    }

    const [row] = await db
        .update(nutrition_requests)
        .set({
            status: "declined",
            decided_at: new Date(),
            trainer_decline_reason: reason.trim(),
        })
        .where(
            and(
                eq(nutrition_requests.id, id),
                eq(nutrition_requests.trainer_id, trainerId),
                inArray(nutrition_requests.status, ["pending", "in_review"])
            )
        )
        .returning();

    if (!row) throw new Error("request_not_decidable");

    // Notifica cliente via chat
    try {
        await db.insert(chat_messages).values({
            trainer_id: trainerId,
            client_id: row.client_id,
            sender_role: "trainer",
            body: `La tua richiesta di piano alimentare non è stata accolta. Motivo: ${reason.trim()}`,
        });
    } catch (err) {
        console.error("[nutrition-requests] decline chat notify failed", { id: row.id, err });
    }

    await logAudit({
        actor,
        action: "nutrition_request.decide",
        resourceType: "nutrition_requests",
        resourceId: row.id,
        clientId: row.client_id,
        metadata: { transition: "declined" },
    });

    return mapRow(row);
}

/**
 * Collega la richiesta a un meal_plan appena creato e la chiude come approved.
 * Da chiamare dentro la transaction che crea il piano (vedi nutrition.ts).
 */
export async function linkRequestToMealPlan(
    id: number,
    trainerId: number,
    mealPlanId: number,
    actor: AuditActor
): Promise<NutritionRequest> {
    // Verifica esistenza piano (FK garantisce ma usiamo per error message chiaro)
    const [plan] = await db
        .select({ id: meal_plans.id })
        .from(meal_plans)
        .where(eq(meal_plans.id, mealPlanId))
        .limit(1);
    if (!plan) throw new Error("meal_plan_not_found");

    const [row] = await db
        .update(nutrition_requests)
        .set({
            status: "approved",
            decided_at: new Date(),
            linked_meal_plan_id: mealPlanId,
        })
        .where(
            and(
                eq(nutrition_requests.id, id),
                eq(nutrition_requests.trainer_id, trainerId),
                inArray(nutrition_requests.status, ["pending", "in_review"])
            )
        )
        .returning();

    if (!row) throw new Error("request_not_decidable");

    try {
        await db.insert(chat_messages).values({
            trainer_id: trainerId,
            client_id: row.client_id,
            sender_role: "trainer",
            body: "✅ Ho preparato il tuo piano alimentare, lo trovi nella sezione Nutrizione dell'app.",
        });
    } catch (err) {
        console.error("[nutrition-requests] approval chat notify failed", { id: row.id, err });
    }

    await logAudit({
        actor,
        action: "nutrition_request.decide",
        resourceType: "nutrition_requests",
        resourceId: row.id,
        clientId: row.client_id,
        metadata: { transition: "approved", meal_plan_id: mealPlanId },
    });

    return mapRow(row);
}

// Suppress unused-import if sql helper isn't needed elsewhere
void sql;
