"use server";

import { db } from "@/db";
import { clients, meal_plan_meals, meal_plans } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq } from "drizzle-orm";
import { getAuthenticatedTrainer } from "@/lib/auth";

const VALID_MOMENTI = [
    "colazione",
    "spuntino_mat",
    "pranzo",
    "spuntino_pom",
    "cena",
    "pre_nanna",
] as const;

interface MealInput {
    giorno_settimana: number;
    momento: string;
    ordine: number;
    descrizione: string;
    kcal: number | null;
    proteine_g: number | null;
    carbo_g: number | null;
    grassi_g: number | null;
    note: string | null;
}

function parseIntOrNull(v: unknown): number | null {
    if (v === null || v === undefined || v === "") return null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
}

async function assertClientOwnership(trainerId: number, clientId: number) {
    const [c] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.trainer_id, trainerId)))
        .limit(1);
    if (!c) throw new Error("Cliente non trovato o non autorizzato");
}

async function assertPlanOwnership(trainerId: number, planId: number) {
    const [p] = await db
        .select({ id: meal_plans.id })
        .from(meal_plans)
        .where(and(eq(meal_plans.id, planId), eq(meal_plans.trainer_id, trainerId)))
        .limit(1);
    if (!p) throw new Error("Piano non trovato o non autorizzato");
}

/**
 * Lista tutti i piani del trainer con dati cliente, per la pagina /nutrition.
 */
export async function listAllMealPlansForTrainer() {
    const trainer = await getAuthenticatedTrainer();
    return db
        .select({
            id: meal_plans.id,
            nome: meal_plans.nome,
            attivo: meal_plans.attivo,
            data_inizio: meal_plans.data_inizio,
            data_fine: meal_plans.data_fine,
            client_id: meal_plans.client_id,
            client_nome: clients.nome,
            client_cognome: clients.cognome,
        })
        .from(meal_plans)
        .leftJoin(clients, eq(clients.id, meal_plans.client_id))
        .where(eq(meal_plans.trainer_id, trainer.id))
        .orderBy(
            desc(meal_plans.attivo),
            asc(clients.cognome),
            desc(meal_plans.data_inizio)
        );
}

/**
 * Lista i clienti del trainer (utility per il selettore in /nutrition).
 */
export async function listTrainerClientsForNutrition() {
    const trainer = await getAuthenticatedTrainer();
    return db
        .select({
            id: clients.id,
            nome: clients.nome,
            cognome: clients.cognome,
        })
        .from(clients)
        .where(eq(clients.trainer_id, trainer.id))
        .orderBy(asc(clients.cognome), asc(clients.nome));
}

/**
 * Piano attivo del cliente + tutti i pasti, per visualizzazione
 * sulla pagina di dettaglio cliente lato trainer. Null se non c'è
 * un piano attivo o se il cliente non appartiene al trainer.
 */
export async function getActiveMealPlanForClientByTrainer(clientId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertClientOwnership(trainer.id, clientId);
    } catch {
        return null;
    }

    const [plan] = await db
        .select()
        .from(meal_plans)
        .where(
            and(
                eq(meal_plans.trainer_id, trainer.id),
                eq(meal_plans.client_id, clientId),
                eq(meal_plans.attivo, true)
            )
        )
        .orderBy(desc(meal_plans.data_inizio))
        .limit(1);
    if (!plan) return null;

    const meals = await db
        .select()
        .from(meal_plan_meals)
        .where(eq(meal_plan_meals.meal_plan_id, plan.id))
        .orderBy(
            asc(meal_plan_meals.giorno_settimana),
            asc(meal_plan_meals.ordine)
        );
    return { plan, meals };
}

/**
 * Lista i piani alimentari di un cliente per la dashboard trainer.
 */
export async function listClientMealPlans(clientId: number) {
    const trainer = await getAuthenticatedTrainer();
    await assertClientOwnership(trainer.id, clientId);
    return db
        .select()
        .from(meal_plans)
        .where(
            and(
                eq(meal_plans.trainer_id, trainer.id),
                eq(meal_plans.client_id, clientId)
            )
        )
        .orderBy(desc(meal_plans.attivo), desc(meal_plans.data_inizio));
}

/**
 * Dettaglio di un piano + tutti i pasti per il builder.
 */
export async function getMealPlanDetail(planId: number) {
    const trainer = await getAuthenticatedTrainer();
    const [plan] = await db
        .select()
        .from(meal_plans)
        .where(
            and(eq(meal_plans.id, planId), eq(meal_plans.trainer_id, trainer.id))
        )
        .limit(1);
    if (!plan) return null;

    const meals = await db
        .select()
        .from(meal_plan_meals)
        .where(eq(meal_plan_meals.meal_plan_id, plan.id))
        .orderBy(
            asc(meal_plan_meals.giorno_settimana),
            asc(meal_plan_meals.ordine)
        );

    return { plan, meals };
}

/**
 * Crea un nuovo piano alimentare per un cliente.
 * Se `attivo=true`, disattiva gli altri piani esistenti dello stesso cliente.
 */
export async function createMealPlan(
    clientId: number,
    formData: FormData
): Promise<{ success: true; id: number } | { success: false; error: string }> {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertClientOwnership(trainer.id, clientId);

        const nome = (formData.get("nome") as string | null)?.trim();
        const dataInizio = formData.get("data_inizio") as string | null;
        const dataFine = (formData.get("data_fine") as string | null) || null;
        const note = (formData.get("note") as string | null) || null;
        const attivo = formData.get("attivo") === "on";

        if (!nome || !dataInizio) {
            return { success: false, error: "Nome e data inizio sono obbligatori" };
        }

        if (attivo) {
            await db
                .update(meal_plans)
                .set({ attivo: false, updated_at: new Date() })
                .where(
                    and(
                        eq(meal_plans.client_id, clientId),
                        eq(meal_plans.trainer_id, trainer.id)
                    )
                );
        }

        const [inserted] = await db
            .insert(meal_plans)
            .values({
                trainer_id: trainer.id,
                client_id: clientId,
                nome,
                data_inizio: dataInizio,
                data_fine: dataFine,
                note,
                attivo,
                kcal_target: parseIntOrNull(formData.get("kcal_target")),
                proteine_g: parseIntOrNull(formData.get("proteine_g")),
                carbo_g: parseIntOrNull(formData.get("carbo_g")),
                grassi_g: parseIntOrNull(formData.get("grassi_g")),
            })
            .returning({ id: meal_plans.id });

        revalidatePath(`/clients/${clientId}`);
        revalidatePath("/nutrition");
        return { success: true, id: inserted.id };
    } catch (error) {
        console.error("Errore creazione piano alimentare:", error);
        return { success: false, error: "Errore interno server" };
    }
}

/**
 * Aggiorna i metadati di un piano (non i pasti). Per i pasti usa
 * `replaceMealPlanMeals`.
 */
export async function updateMealPlan(planId: number, formData: FormData) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertPlanOwnership(trainer.id, planId);

        const nome = (formData.get("nome") as string | null)?.trim();
        const dataInizio = formData.get("data_inizio") as string | null;
        const dataFine = (formData.get("data_fine") as string | null) || null;
        const note = (formData.get("note") as string | null) || null;

        if (!nome || !dataInizio) {
            return { success: false, error: "Nome e data inizio sono obbligatori" };
        }

        await db
            .update(meal_plans)
            .set({
                nome,
                data_inizio: dataInizio,
                data_fine: dataFine,
                note,
                kcal_target: parseIntOrNull(formData.get("kcal_target")),
                proteine_g: parseIntOrNull(formData.get("proteine_g")),
                carbo_g: parseIntOrNull(formData.get("carbo_g")),
                grassi_g: parseIntOrNull(formData.get("grassi_g")),
                updated_at: new Date(),
            })
            .where(eq(meal_plans.id, planId));

        revalidatePath("/nutrition");
        return { success: true };
    } catch (error) {
        console.error("Errore aggiornamento piano alimentare:", error);
        return { success: false, error: "Errore interno server" };
    }
}

/**
 * Sostituisce tutti i pasti di un piano (delete + insert).
 * `meals` deve essere già validato lato chiamante (JSON-parsed dal form).
 */
export async function replaceMealPlanMeals(
    planId: number,
    meals: MealInput[]
) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertPlanOwnership(trainer.id, planId);

        const cleaned = meals
            .filter(
                (m) =>
                    m &&
                    typeof m.descrizione === "string" &&
                    m.descrizione.trim() !== "" &&
                    Number.isInteger(m.giorno_settimana) &&
                    m.giorno_settimana >= 1 &&
                    m.giorno_settimana <= 7 &&
                    VALID_MOMENTI.includes(m.momento as (typeof VALID_MOMENTI)[number])
            )
            .map((m) => ({
                meal_plan_id: planId,
                giorno_settimana: m.giorno_settimana,
                momento: m.momento,
                ordine: Number.isInteger(m.ordine) ? m.ordine : 0,
                descrizione: m.descrizione.trim(),
                kcal: m.kcal ?? null,
                proteine_g: m.proteine_g ?? null,
                carbo_g: m.carbo_g ?? null,
                grassi_g: m.grassi_g ?? null,
                note: m.note?.trim() || null,
            }));

        await db.delete(meal_plan_meals).where(eq(meal_plan_meals.meal_plan_id, planId));
        if (cleaned.length > 0) {
            await db.insert(meal_plan_meals).values(cleaned);
        }
        await db
            .update(meal_plans)
            .set({ updated_at: new Date() })
            .where(eq(meal_plans.id, planId));

        revalidatePath("/nutrition");
        return { success: true };
    } catch (error) {
        console.error("Errore aggiornamento pasti:", error);
        return { success: false, error: "Errore interno server" };
    }
}

/**
 * Imposta un piano come attivo; disattiva gli altri piani dello stesso cliente.
 */
export async function setActiveMealPlan(planId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const [plan] = await db
            .select({ id: meal_plans.id, client_id: meal_plans.client_id })
            .from(meal_plans)
            .where(
                and(
                    eq(meal_plans.id, planId),
                    eq(meal_plans.trainer_id, trainer.id)
                )
            )
            .limit(1);
        if (!plan) {
            return { success: false, error: "Piano non trovato" };
        }

        await db
            .update(meal_plans)
            .set({ attivo: false, updated_at: new Date() })
            .where(
                and(
                    eq(meal_plans.client_id, plan.client_id),
                    eq(meal_plans.trainer_id, trainer.id)
                )
            );
        await db
            .update(meal_plans)
            .set({ attivo: true, updated_at: new Date() })
            .where(eq(meal_plans.id, planId));

        revalidatePath("/nutrition");
        return { success: true };
    } catch (error) {
        console.error("Errore attivazione piano:", error);
        return { success: false, error: "Errore interno server" };
    }
}

export async function deleteMealPlan(planId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertPlanOwnership(trainer.id, planId);
        await db.delete(meal_plans).where(eq(meal_plans.id, planId));
        revalidatePath("/nutrition");
        return { success: true };
    } catch (error) {
        console.error("Errore eliminazione piano:", error);
        return { success: false, error: "Errore interno server" };
    }
}
