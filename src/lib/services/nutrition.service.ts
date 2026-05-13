import { db } from "@/db";
import { meal_plan_meals, meal_plans } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import type { ClientSession } from "@/lib/client-auth";

export interface MealPlanMealRow {
    id: number;
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

export interface MealPlanWithMeals {
    id: number;
    nome: string;
    data_inizio: string;
    data_fine: string | null;
    note: string | null;
    kcal_target: number | null;
    proteine_g: number | null;
    carbo_g: number | null;
    grassi_g: number | null;
    meals: MealPlanMealRow[];
}

/**
 * Ritorna il piano alimentare attivo del cliente loggato (lato mobile)
 * con tutti i pasti, ordinati per giorno_settimana e ordine.
 * Null se non esiste un piano attivo.
 */
export async function getActiveMealPlanForClient(
    session: ClientSession
): Promise<MealPlanWithMeals | null> {
    const [plan] = await db
        .select()
        .from(meal_plans)
        .where(
            and(
                eq(meal_plans.client_id, session.id),
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
        .orderBy(asc(meal_plan_meals.giorno_settimana), asc(meal_plan_meals.ordine));

    return {
        id: plan.id,
        nome: plan.nome,
        data_inizio: plan.data_inizio,
        data_fine: plan.data_fine,
        note: plan.note,
        kcal_target: plan.kcal_target,
        proteine_g: plan.proteine_g,
        carbo_g: plan.carbo_g,
        grassi_g: plan.grassi_g,
        meals: meals.map((m) => ({
            id: m.id,
            giorno_settimana: m.giorno_settimana,
            momento: m.momento,
            ordine: m.ordine,
            descrizione: m.descrizione,
            kcal: m.kcal,
            proteine_g: m.proteine_g,
            carbo_g: m.carbo_g,
            grassi_g: m.grassi_g,
            note: m.note,
        })),
    };
}
