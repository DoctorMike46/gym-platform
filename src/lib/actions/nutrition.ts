"use server";

import { db } from "@/db";
import {
    body_measurements,
    client_nutrition_profile,
    clients,
    meal_plan_meals,
    meal_plans,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq } from "drizzle-orm";
import { getAuthenticatedTrainer } from "@/lib/auth";
import { getOpenAIClient, OPENAI_TEXT_MODEL, OPENAI_VISION_MODEL } from "@/lib/openai";
import { searchFoods, type FoodResult } from "@/lib/services/food-lookup.service";
import {
    parseAltezzaCm,
    parsePesoKg,
    type LivelloAttivita,
    type Obiettivo,
    type Sesso,
} from "@/lib/nutrition/calcs";
import type { MealItem } from "@/lib/nutrition/types";

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
    items?: MealItem[] | null;
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
                items: m.items && m.items.length > 0 ? m.items : null,
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

// ── AI: generazione piano alimentare ──────────────────────────────────

const AI_FOOD_ITEM_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: [
        "alimento",
        "quantita_g",
        "kcal",
        "proteine_g",
        "carbo_g",
        "grassi_g",
        "note",
    ],
    properties: {
        alimento: { type: "string" },
        quantita_g: { type: "integer", minimum: 0 },
        kcal: { type: "integer", minimum: 0 },
        proteine_g: { type: "integer", minimum: 0 },
        carbo_g: { type: "integer", minimum: 0 },
        grassi_g: { type: "integer", minimum: 0 },
        note: { type: ["string", "null"] },
    },
} as const;

const AI_PLAN_JSON_SCHEMA = {
    name: "meal_plan",
    schema: {
        type: "object",
        additionalProperties: false,
        required: ["meals"],
        properties: {
            meals: {
                type: "array",
                description:
                    "Tutti i pasti per 7 giorni, ordinati per giorno e ordine all'interno del giorno.",
                items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                        "giorno_settimana",
                        "momento",
                        "ordine",
                        "descrizione",
                        "kcal",
                        "proteine_g",
                        "carbo_g",
                        "grassi_g",
                        "note",
                        "items",
                    ],
                    properties: {
                        giorno_settimana: {
                            type: "integer",
                            minimum: 1,
                            maximum: 7,
                            description: "1=Lunedì, 7=Domenica",
                        },
                        momento: {
                            type: "string",
                            enum: [
                                "colazione",
                                "spuntino_mat",
                                "pranzo",
                                "spuntino_pom",
                                "cena",
                                "pre_nanna",
                            ],
                        },
                        ordine: { type: "integer", minimum: 0 },
                        descrizione: {
                            type: "string",
                            description:
                                "Riassunto testuale del pasto con porzioni in grammi. Es: '80g pasta integrale + 150g pollo + 30g olio EVO'.",
                        },
                        kcal: { type: "integer", minimum: 0 },
                        proteine_g: { type: "integer", minimum: 0 },
                        carbo_g: { type: "integer", minimum: 0 },
                        grassi_g: { type: "integer", minimum: 0 },
                        note: { type: ["string", "null"] },
                        items: {
                            type: "array",
                            description:
                                "Alimenti strutturati che compongono il pasto. Ogni alimento DEVE avere 3 alternative dello stesso macros target (±10% kcal).",
                            items: {
                                type: "object",
                                additionalProperties: false,
                                required: [
                                    "alimento",
                                    "quantita_g",
                                    "kcal",
                                    "proteine_g",
                                    "carbo_g",
                                    "grassi_g",
                                    "note",
                                    "alternatives",
                                ],
                                properties: {
                                    ...AI_FOOD_ITEM_SCHEMA.properties,
                                    alternatives: {
                                        type: "array",
                                        description:
                                            "Almeno 3 alimenti alternativi con macros equivalenti (±10% kcal).",
                                        items: AI_FOOD_ITEM_SCHEMA,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    strict: true,
} as const;

export interface AIGenerateParams {
    clientId: number;
    obiettivo: "definizione" | "massa" | "mantenimento" | "ricomposizione";
    kcalTarget?: number;
    proteineG?: number;
    carboG?: number;
    grassiG?: number;
    preferenze?: string;
    momenti?: string[];
}

const GIORNI_LABEL = [
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
    "Domenica",
];

async function generateSingleDayPlan(args: {
    dayIdx: number; // 1-7
    momenti: string[];
    obiettivo: string;
    kcalTarget?: number;
    proteineG?: number;
    carboG?: number;
    grassiG?: number;
    preferenze?: string;
}): Promise<AIPlanMeal[]> {
    const {
        dayIdx,
        momenti,
        obiettivo,
        kcalTarget,
        proteineG,
        carboG,
        grassiG,
        preferenze,
    } = args;
    const lines: string[] = [];
    lines.push(`Giorno: ${GIORNI_LABEL[dayIdx - 1]} (giorno_settimana=${dayIdx}).`);
    lines.push(`Obiettivo: ${obiettivo}.`);
    if (kcalTarget) lines.push(`Calorie target: ${kcalTarget} kcal.`);
    if (proteineG) lines.push(`Proteine: ${proteineG} g.`);
    if (carboG) lines.push(`Carboidrati: ${carboG} g.`);
    if (grassiG) lines.push(`Grassi: ${grassiG} g.`);
    lines.push(`Momenti: ${momenti.join(", ")}.`);
    if (preferenze) lines.push(`Note: ${preferenze}.`);

    const system = `Sei un nutrizionista sportivo italiano. Genera UN SOLO GIORNO di piano alimentare.

REGOLE OBBLIGATORIE:
- Output: JSON conforme allo schema, array "meals" con esattamente ${momenti.length} pasti.
- TUTTI i pasti hanno giorno_settimana=${dayIdx}.
- Per ogni pasto:
  * "ordine" parte da 0 per il primo momento e cresce
  * "descrizione" riassunto testuale (es: "80g pasta + 150g pollo + 30g olio EVO")
  * "items" lista strutturata degli alimenti con porzioni in grammi e macros per quella quantità
  * kcal/macros del pasto = somma degli items
- Per ogni item, fornisci ESATTAMENTE 3 alternatives con macros equivalenti (±10% kcal).
- I valori kcal/macros sono interi.
- Cucina italiana. Rispetta regime alimentare/allergie/esclusioni dell'utente.`;

    const user = lines.join("\n");

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
        model: OPENAI_TEXT_MODEL,
        messages: [
            { role: "system", content: system },
            { role: "user", content: user },
        ],
        response_format: {
            type: "json_schema",
            json_schema: AI_PLAN_JSON_SCHEMA,
        },
        temperature: 0.7,
    });

    const finish = response.choices[0]?.finish_reason;
    const content = response.choices[0]?.message?.content;
    if (!content || finish !== "stop") {
        throw new Error(
            `Generazione giorno ${dayIdx} interrotta (${finish ?? "no content"})`,
        );
    }
    const parsed = JSON.parse(content) as AIPlanResponse;
    // Garantisce giorno_settimana corretto anche se il modello sbaglia
    return parsed.meals.map((m) => ({ ...m, giorno_settimana: dayIdx }));
}

export async function generateMealPlanWithAI(params: AIGenerateParams) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertClientOwnership(trainer.id, params.clientId);

        const momenti =
            params.momenti && params.momenti.length > 0
                ? params.momenti
                : ["colazione", "spuntino_mat", "pranzo", "spuntino_pom", "cena"];

        // 7 chiamate parallele, una per giorno: indispensabile perché il modello
        // gpt-4o-mini con items+alternatives non riesce a generare 7 giorni in un
        // singolo response (token output ~16k saturati o early-stop).
        const dayPromises = Array.from({ length: 7 }, (_, i) =>
            generateSingleDayPlan({
                dayIdx: i + 1,
                momenti,
                obiettivo: params.obiettivo,
                kcalTarget: params.kcalTarget,
                proteineG: params.proteineG,
                carboG: params.carboG,
                grassiG: params.grassiG,
                preferenze: params.preferenze,
            }),
        );
        const days = await Promise.all(dayPromises);
        const meals: AIPlanMeal[] = days.flat();

        return { success: true as const, meals };
    } catch (e) {
        console.error("generateMealPlanWithAI error:", e);
        const msg = e instanceof Error ? e.message : "Errore generazione AI";
        return { success: false as const, error: msg };
    }
}

interface AIPlanItem {
    alimento: string;
    quantita_g: number;
    kcal: number;
    proteine_g: number;
    carbo_g: number;
    grassi_g: number;
    note?: string | null;
}

interface AIPlanItemWithAlts extends AIPlanItem {
    alternatives: AIPlanItem[];
}

interface AIPlanMeal {
    giorno_settimana: number;
    momento: string;
    ordine: number;
    descrizione: string;
    kcal: number;
    proteine_g: number;
    carbo_g: number;
    grassi_g: number;
    note?: string | null;
    items?: AIPlanItemWithAlts[];
}

interface AIPlanResponse {
    meals: AIPlanMeal[];
}

/**
 * Importa un piano alimentare da PDF/immagine usando OpenAI Vision.
 * Restituisce la struttura JSON dei pasti, da editare prima di salvare.
 */
export async function importMealPlanFromFile(formData: FormData) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const clientIdRaw = formData.get("client_id");
        const file = formData.get("file");
        if (!clientIdRaw || !(file instanceof File)) {
            return { success: false as const, error: "Parametri mancanti" };
        }
        const clientId = Number(clientIdRaw);
        if (!Number.isFinite(clientId)) {
            return { success: false as const, error: "client_id non valido" };
        }
        await assertClientOwnership(trainer.id, clientId);

        const mime = file.type || "application/octet-stream";
        const allowed = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "application/pdf",
        ];
        if (!allowed.includes(mime)) {
            return {
                success: false as const,
                error: "Tipo file non supportato (PDF, JPG, PNG, WEBP)",
            };
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > 10 * 1024 * 1024) {
            return { success: false as const, error: "File troppo grande (max 10MB)" };
        }
        const base64 = buffer.toString("base64");
        const dataUri = `data:${mime};base64,${base64}`;

        const system = `Sei un assistente che estrae la struttura di un piano alimentare da un documento (PDF o immagine).

OBIETTIVO: produrre un JSON conforme allo schema con tutti i pasti rilevati per i 7 giorni della settimana.

REGOLE:
- Se il documento copre meno di 7 giorni, replica i giorni mancanti seguendo il pattern visibile.
- Se mancano kcal o macro espliciti, stimali in base alle porzioni (numeri interi).
- "momento" deve essere uno tra: colazione, spuntino_mat, pranzo, spuntino_pom, cena, pre_nanna. Mappa "merenda" o "snack" mattutini a spuntino_mat e pomeridiani a spuntino_pom.
- "giorno_settimana": 1=Lunedì, 7=Domenica.
- "ordine": parte da 0 nel primo momento di ogni giorno.
- "descrizione": riporta porzioni in grammi quando specificate nel documento.`;

        const openai = getOpenAIClient();
        const response = await openai.chat.completions.create({
            model: OPENAI_VISION_MODEL,
            messages: [
                { role: "system", content: system },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Estrai il piano alimentare contenuto in questo documento.",
                        },
                        {
                            type: "image_url",
                            image_url: { url: dataUri },
                        },
                    ],
                },
            ],
            response_format: {
                type: "json_schema",
                json_schema: AI_PLAN_JSON_SCHEMA,
            },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            return { success: false as const, error: "Risposta AI vuota" };
        }
        const parsed = JSON.parse(content) as AIPlanResponse;
        return { success: true as const, meals: parsed.meals };
    } catch (e) {
        console.error("importMealPlanFromFile error:", e);
        const msg = e instanceof Error ? e.message : "Errore import";
        return { success: false as const, error: msg };
    }
}

// ── Food lookup (Open Food Facts + cache locale) ──────────────────

export async function searchFoodsAction(query: string): Promise<FoodResult[]> {
    await getAuthenticatedTrainer();
    return searchFoods(query);
}

// ── Client Nutrition Profile ─────────────────────────────────────

export interface NutritionProfileData {
    sesso: Sesso | null;
    livello_attivita: LivelloAttivita | null;
    obiettivo_default: Obiettivo | null;
    regime_alimentare: string | null;
    allergeni: string[];
    intolleranze: string | null;
    preferenze_alimenti: string[];
    esclusioni_alimenti: string[];
    note_aggiuntive: string | null;
}

export interface ClientNutritionFullData {
    client: {
        id: number;
        nome: string;
        cognome: string;
        eta: number | null;
        data_di_nascita: string | null;
        peso_text: string | null;
        altezza_text: string | null;
    };
    derived: {
        pesoKg: number | null;
        altezzaCm: number | null;
    };
    profile: NutritionProfileData | null;
    latestMeasurement: {
        date: string;
        peso_kg: string | null;
    } | null;
}

function rowToProfile(row: typeof client_nutrition_profile.$inferSelect): NutritionProfileData {
    return {
        sesso: (row.sesso as Sesso | null) ?? null,
        livello_attivita: (row.livello_attivita as LivelloAttivita | null) ?? null,
        obiettivo_default: (row.obiettivo_default as Obiettivo | null) ?? null,
        regime_alimentare: row.regime_alimentare ?? null,
        allergeni: Array.isArray(row.allergeni) ? (row.allergeni as string[]) : [],
        intolleranze: row.intolleranze ?? null,
        preferenze_alimenti: Array.isArray(row.preferenze_alimenti)
            ? (row.preferenze_alimenti as string[])
            : [],
        esclusioni_alimenti: Array.isArray(row.esclusioni_alimenti)
            ? (row.esclusioni_alimenti as string[])
            : [],
        note_aggiuntive: row.note_aggiuntive ?? null,
    };
}

export async function getNutritionProfile(
    clientId: number,
): Promise<NutritionProfileData | null> {
    const trainer = await getAuthenticatedTrainer();
    await assertClientOwnership(trainer.id, clientId);
    const [row] = await db
        .select()
        .from(client_nutrition_profile)
        .where(eq(client_nutrition_profile.client_id, clientId))
        .limit(1);
    return row ? rowToProfile(row) : null;
}

export async function upsertNutritionProfile(
    clientId: number,
    data: Partial<NutritionProfileData>,
) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertClientOwnership(trainer.id, clientId);

        const [existing] = await db
            .select({ id: client_nutrition_profile.id })
            .from(client_nutrition_profile)
            .where(eq(client_nutrition_profile.client_id, clientId))
            .limit(1);

        const payload = {
            sesso: data.sesso ?? null,
            livello_attivita: data.livello_attivita ?? null,
            obiettivo_default: data.obiettivo_default ?? null,
            regime_alimentare: data.regime_alimentare ?? null,
            allergeni: data.allergeni ?? [],
            intolleranze: data.intolleranze ?? null,
            preferenze_alimenti: data.preferenze_alimenti ?? [],
            esclusioni_alimenti: data.esclusioni_alimenti ?? [],
            note_aggiuntive: data.note_aggiuntive ?? null,
            updated_at: new Date(),
        };

        if (existing) {
            await db
                .update(client_nutrition_profile)
                .set(payload)
                .where(eq(client_nutrition_profile.id, existing.id));
        } else {
            await db.insert(client_nutrition_profile).values({
                client_id: clientId,
                trainer_id: trainer.id,
                ...payload,
            });
        }
        revalidatePath(`/clients/${clientId}`);
        revalidatePath("/nutrition");
        return { success: true as const };
    } catch (e) {
        console.error("upsertNutritionProfile error:", e);
        return { success: false as const, error: "Errore salvataggio profilo" };
    }
}

/**
 * Restituisce tutti i dati necessari per pre-popolare il form nuovo piano:
 * anagrafica cliente, ultima misurazione peso, profilo nutrizionale.
 */
export async function getClientFullDataForNutrition(
    clientId: number,
): Promise<ClientNutritionFullData | null> {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertClientOwnership(trainer.id, clientId);
    } catch {
        return null;
    }

    const [client] = await db
        .select({
            id: clients.id,
            nome: clients.nome,
            cognome: clients.cognome,
            eta: clients.eta,
            data_di_nascita: clients.data_di_nascita,
            peso: clients.peso,
            altezza: clients.altezza,
        })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);
    if (!client) return null;

    const [latestMeas] = await db
        .select({ date: body_measurements.date, peso_kg: body_measurements.peso_kg })
        .from(body_measurements)
        .where(eq(body_measurements.client_id, clientId))
        .orderBy(desc(body_measurements.date))
        .limit(1);

    const [profileRow] = await db
        .select()
        .from(client_nutrition_profile)
        .where(eq(client_nutrition_profile.client_id, clientId))
        .limit(1);

    // pesoKg preferisce la misurazione più recente, altrimenti il text di clients.peso
    const pesoFromMeas = latestMeas ? parsePesoKg(latestMeas.peso_kg) : null;
    const pesoFromClient = parsePesoKg(client.peso);
    const pesoKg = pesoFromMeas ?? pesoFromClient;
    const altezzaCm = parseAltezzaCm(client.altezza);

    return {
        client: {
            id: client.id,
            nome: client.nome,
            cognome: client.cognome,
            eta: client.eta,
            data_di_nascita: client.data_di_nascita,
            peso_text: client.peso,
            altezza_text: client.altezza,
        },
        derived: { pesoKg, altezzaCm },
        profile: profileRow ? rowToProfile(profileRow) : null,
        latestMeasurement: latestMeas
            ? { date: latestMeas.date, peso_kg: latestMeas.peso_kg }
            : null,
    };
}
