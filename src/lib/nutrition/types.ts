// Tipi condivisi per alimenti strutturati e alternative.
// Salvati come JSONB nel campo meal_plan_meals.items.

export interface MealItemAlternative {
    alimento: string; // "Tacchino petto"
    quantita_g: number; // 180
    kcal: number;
    proteine_g: number;
    carbo_g: number;
    grassi_g: number;
    note?: string | null;
}

export interface MealItem {
    alimento: string; // "Pollo petto"
    quantita_g: number; // 150
    kcal: number;
    proteine_g: number;
    carbo_g: number;
    grassi_g: number;
    note?: string | null;
    alternatives: MealItemAlternative[];
}

export function sumItems(items: MealItem[]): {
    kcal: number;
    proteine_g: number;
    carbo_g: number;
    grassi_g: number;
} {
    return items.reduce(
        (acc, i) => ({
            kcal: acc.kcal + (i.kcal || 0),
            proteine_g: acc.proteine_g + (i.proteine_g || 0),
            carbo_g: acc.carbo_g + (i.carbo_g || 0),
            grassi_g: acc.grassi_g + (i.grassi_g || 0),
        }),
        { kcal: 0, proteine_g: 0, carbo_g: 0, grassi_g: 0 },
    );
}

export function itemsToDescription(items: MealItem[]): string {
    return items
        .map((i) => `${i.quantita_g}g ${i.alimento}`)
        .join("\n");
}

/**
 * Rileva conflitti tra gli alimenti del pasto e gli allergeni del cliente.
 * Match case-insensitive su substring (semplice, miglirabile con parsing più ricco).
 */
export function detectAllergenConflicts(
    items: MealItem[],
    allergeni: string[],
): { item: string; allergene: string }[] {
    const out: { item: string; allergene: string }[] = [];
    for (const it of items) {
        const hay = `${it.alimento} ${it.note ?? ""}`.toLowerCase();
        for (const a of allergeni) {
            if (hay.includes(a.toLowerCase())) {
                out.push({ item: it.alimento, allergene: a });
            }
        }
        for (const alt of it.alternatives) {
            const hayAlt = `${alt.alimento} ${alt.note ?? ""}`.toLowerCase();
            for (const a of allergeni) {
                if (hayAlt.includes(a.toLowerCase())) {
                    out.push({ item: alt.alimento, allergene: a });
                }
            }
        }
    }
    return out;
}
