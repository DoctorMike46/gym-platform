// Calcoli nutrizionali: BMR, TDEE, macros target.
// Riferimenti:
// - Mifflin-St Jeor (1990): formula più accurata per BMR adulti
// - Moltiplicatori TDEE: standard ACSM
// - Target macros per obiettivo: 1.8-2.4g/kg proteine, 0.8-1.2g/kg grassi,
//   resto carboidrati.

export type Sesso = "M" | "F" | "altro";
export type LivelloAttivita =
    | "sedentario"
    | "leggero"
    | "moderato"
    | "intenso"
    | "molto_intenso";
export type Obiettivo =
    | "definizione"
    | "mantenimento"
    | "massa"
    | "ricomposizione";

export interface MacroTarget {
    kcal: number;
    proteine_g: number;
    carbo_g: number;
    grassi_g: number;
}

export const ACTIVITY_MULTIPLIERS: Record<LivelloAttivita, number> = {
    sedentario: 1.2,
    leggero: 1.375,
    moderato: 1.55,
    intenso: 1.725,
    molto_intenso: 1.9,
};

export const ACTIVITY_LABELS: Record<LivelloAttivita, string> = {
    sedentario: "Sedentario (ufficio, no sport)",
    leggero: "Leggero (1-3 allenamenti/sett)",
    moderato: "Moderato (3-5 allenamenti/sett)",
    intenso: "Intenso (6-7 allenamenti/sett)",
    molto_intenso: "Molto intenso (2× al giorno o lavoro fisico)",
};

export const OBIETTIVO_LABELS: Record<Obiettivo, string> = {
    definizione: "Definizione (deficit calorico)",
    mantenimento: "Mantenimento",
    massa: "Massa (surplus calorico)",
    ricomposizione: "Ricomposizione corporea",
};

/**
 * BMR (Basal Metabolic Rate) con formula Mifflin-St Jeor.
 * Restituisce kcal/giorno. Null se dati incompleti.
 */
export function calcBMR(params: {
    sesso?: Sesso | null;
    pesoKg?: number | null;
    altezzaCm?: number | null;
    eta?: number | null;
}): number | null {
    const { sesso, pesoKg, altezzaCm, eta } = params;
    if (!pesoKg || !altezzaCm || !eta) return null;
    if (pesoKg <= 0 || altezzaCm <= 0 || eta <= 0) return null;

    const base = 10 * pesoKg + 6.25 * altezzaCm - 5 * eta;
    if (sesso === "M") return Math.round(base + 5);
    if (sesso === "F") return Math.round(base - 161);
    // Sesso "altro" o non specificato: media tra le due formule
    return Math.round(base - 78);
}

/**
 * TDEE (Total Daily Energy Expenditure) = BMR × moltiplicatore attività.
 */
export function calcTDEE(
    bmr: number | null,
    livello: LivelloAttivita | null,
): number | null {
    if (!bmr || !livello) return null;
    return Math.round(bmr * ACTIVITY_MULTIPLIERS[livello]);
}

/**
 * Calcola le calorie target in base a TDEE e obiettivo.
 * - Definizione: -500 kcal (~0.5kg/sett)
 * - Mantenimento: TDEE
 * - Massa: +300 kcal (lean bulk)
 * - Ricomposizione: TDEE (deficit/surplus alternati con allenamento)
 */
export function calcKcalTarget(
    tdee: number,
    obiettivo: Obiettivo,
): number {
    switch (obiettivo) {
        case "definizione":
            return Math.max(1200, tdee - 500);
        case "massa":
            return tdee + 300;
        case "mantenimento":
        case "ricomposizione":
        default:
            return tdee;
    }
}

/**
 * Calcola i target macros completi (kcal + P/C/G) in base a peso e obiettivo.
 * - Proteine: 1.8-2.2 g/kg in base all'obiettivo
 * - Grassi: 0.8-1.0 g/kg
 * - Carbo: resto delle calorie
 */
export function calcMacroTarget(params: {
    tdee: number;
    pesoKg: number;
    obiettivo: Obiettivo;
}): MacroTarget {
    const kcal = calcKcalTarget(params.tdee, params.obiettivo);

    const proteinePerKg =
        params.obiettivo === "definizione"
            ? 2.2
            : params.obiettivo === "massa"
              ? 2.0
              : 1.8;
    const grassiPerKg = params.obiettivo === "definizione" ? 0.8 : 1.0;

    const proteine_g = Math.round(proteinePerKg * params.pesoKg);
    const grassi_g = Math.round(grassiPerKg * params.pesoKg);
    const kcalDaProtGrassi = proteine_g * 4 + grassi_g * 9;
    const kcalCarbo = Math.max(0, kcal - kcalDaProtGrassi);
    const carbo_g = Math.round(kcalCarbo / 4);

    return { kcal, proteine_g, carbo_g, grassi_g };
}

// ── Parser per i campi text di `clients` (peso/altezza testo libero) ──

export function parsePesoKg(input: string | null | undefined): number | null {
    if (!input) return null;
    const cleaned = input.replace(/,/g, ".").replace(/[^\d.]/g, "");
    if (!cleaned) return null;
    const n = parseFloat(cleaned);
    if (!Number.isFinite(n) || n <= 0 || n > 500) return null;
    return n;
}

export function parseAltezzaCm(input: string | null | undefined): number | null {
    if (!input) return null;
    const cleaned = input.replace(/,/g, ".").trim().toLowerCase();
    const m = cleaned.match(/^(\d+(?:\.\d+)?)\s*(m|cm)?$/);
    if (!m) {
        const fallback = parseFloat(cleaned);
        if (Number.isFinite(fallback)) {
            return fallback < 3 ? Math.round(fallback * 100) : Math.round(fallback);
        }
        return null;
    }
    const n = parseFloat(m[1]);
    const unit = m[2];
    if (!Number.isFinite(n) || n <= 0) return null;
    if (unit === "m" || (n < 3 && !unit)) return Math.round(n * 100);
    return Math.round(n);
}

export function calcBMI(pesoKg: number | null, altezzaCm: number | null): number | null {
    if (!pesoKg || !altezzaCm) return null;
    const m = altezzaCm / 100;
    return Math.round((pesoKg / (m * m)) * 10) / 10;
}

/**
 * Stima i target macros quando il calcolo Mifflin-St Jeor non è possibile
 * (manca sesso/attività/età/altezza). Usa kcal/kg corpo come euristica
 * adulto medio, con i fattori per obiettivo. Se manca anche il peso, usa
 * default fissi per persona ~70kg.
 */
export function defaultMacroTarget(params: {
    obiettivo: Obiettivo;
    pesoKg?: number | null;
}): MacroTarget {
    const peso = params.pesoKg && params.pesoKg > 0 ? params.pesoKg : 70;

    // kcal/kg base per obiettivo (adulto attivo medio)
    const kcalPerKg =
        params.obiettivo === "definizione"
            ? 28
            : params.obiettivo === "massa"
              ? 38
              : 32; // mantenimento + ricomposizione

    const kcal = Math.round(peso * kcalPerKg);

    const proteinePerKg =
        params.obiettivo === "definizione"
            ? 2.2
            : params.obiettivo === "massa"
              ? 2.0
              : 1.8;
    const grassiPerKg = params.obiettivo === "definizione" ? 0.8 : 1.0;

    const proteine_g = Math.round(proteinePerKg * peso);
    const grassi_g = Math.round(grassiPerKg * peso);
    const kcalDaProtGrassi = proteine_g * 4 + grassi_g * 9;
    const kcalCarbo = Math.max(0, kcal - kcalDaProtGrassi);
    const carbo_g = Math.round(kcalCarbo / 4);

    return { kcal, proteine_g, carbo_g, grassi_g };
}
