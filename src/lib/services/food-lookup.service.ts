import { db } from "@/db";
import { foods_cache } from "@/db/schema";
import { eq, ilike, sql } from "drizzle-orm";

export interface FoodResult {
    id: number;
    offId: string | null;
    nome: string;
    brand: string | null;
    kcalPer100g: number | null;
    proteineG: number | null;
    carboG: number | null;
    grassiG: number | null;
    fibreG: number | null;
}

/**
 * Cerca alimenti nel database locale (dataset curato italiano CREA/INRAN).
 * Il fallback Open Food Facts è disabilitato perché ritornava prodotti in
 * lingue diverse dall'italiano e con dati nutrizionali poco affidabili.
 * Per aggiungere nuovi alimenti, eseguire `scripts/seed-foods-it.sql`.
 */
export async function searchFoods(query: string): Promise<FoodResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    const local = await db
        .select()
        .from(foods_cache)
        .where(ilike(foods_cache.nome, `%${q}%`))
        .orderBy(sql`length(${foods_cache.nome})`)
        .limit(20);

    return local.map(rowToResult);
}

export async function getFoodById(id: number): Promise<FoodResult | null> {
    const [row] = await db
        .select()
        .from(foods_cache)
        .where(eq(foods_cache.id, id))
        .limit(1);
    return row ? rowToResult(row) : null;
}

function rowToResult(row: typeof foods_cache.$inferSelect): FoodResult {
    return {
        id: row.id,
        offId: row.off_id,
        nome: row.nome,
        brand: row.brand,
        kcalPer100g: row.kcal_per_100g,
        proteineG: row.proteine_g,
        carboG: row.carbo_g,
        grassiG: row.grassi_g,
        fibreG: row.fibre_g,
    };
}
