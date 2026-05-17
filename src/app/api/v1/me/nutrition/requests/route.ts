import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { createNutritionRequest } from "@/lib/services/nutrition-requests.service";
import {
    OBIETTIVI,
    type CreateRequestInput,
} from "@/lib/services/nutrition-requests.types";

export const runtime = "nodejs";

const MAX_LIST_LEN = 50;
const MAX_ITEM_LEN = 100;
const MAX_FREE_TEXT = 5_000;

function validateStringArray(arr: unknown, field: string): string[] | null | undefined {
    if (arr === undefined) return undefined;
    if (arr === null) return null;
    if (!Array.isArray(arr)) throw new Error(`invalid_${field}`);
    if (arr.length > MAX_LIST_LEN) throw new Error(`too_many_${field}`);
    for (const item of arr) {
        if (typeof item !== "string") throw new Error(`invalid_${field}`);
        if (item.length > MAX_ITEM_LEN) throw new Error(`item_too_long_${field}`);
    }
    return arr as string[];
}

function validateFreeText(value: unknown, field: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "string") throw new Error(`invalid_${field}`);
    if (value.length > MAX_FREE_TEXT) throw new Error(`too_long_${field}`);
    return value;
}

export async function POST(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let raw: CreateRequestInput;
    try {
        raw = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!raw.obiettivo || !OBIETTIVI.includes(raw.obiettivo)) {
        return jsonError("invalid_obiettivo", "Obiettivo richiesto e valido", 400);
    }

    let payload: CreateRequestInput;
    try {
        payload = {
            obiettivo: raw.obiettivo,
            timeframe_settimane:
                raw.timeframe_settimane === undefined ? undefined : raw.timeframe_settimane,
            peso_target_kg: validateFreeText(raw.peso_target_kg, "peso_target_kg") as string | null | undefined,
            motivazione: validateFreeText(raw.motivazione, "motivazione") as string | null | undefined,
            regime_alimentare: validateFreeText(raw.regime_alimentare, "regime_alimentare") as string | null | undefined,
            allergeni: validateStringArray(raw.allergeni, "allergeni"),
            intolleranze: validateStringArray(raw.intolleranze, "intolleranze"),
            cibi_preferiti: validateStringArray(raw.cibi_preferiti, "cibi_preferiti"),
            cibi_evitati: validateStringArray(raw.cibi_evitati, "cibi_evitati"),
            n_pasti_die: raw.n_pasti_die,
            orari_pasti: validateStringArray(raw.orari_pasti, "orari_pasti"),
            occasioni_sociali: raw.occasioni_sociali,
            ore_sonno: raw.ore_sonno,
            livello_stress: raw.livello_stress,
            consumo_acqua_litri: validateFreeText(raw.consumo_acqua_litri, "consumo_acqua_litri") as string | null | undefined,
            fumo: raw.fumo === undefined ? undefined : raw.fumo,
            integratori: Array.isArray(raw.integratori) ? raw.integratori : raw.integratori === null ? null : undefined,
            patologie: validateFreeText(raw.patologie, "patologie") as string | null | undefined,
            farmaci: validateFreeText(raw.farmaci, "farmaci") as string | null | undefined,
            note_libere: validateFreeText(raw.note_libere, "note_libere") as string | null | undefined,
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : "invalid_body";
        return jsonError(msg, "Dati richiesta non validi", 400);
    }

    try {
        const request = await createNutritionRequest(
            auth.session.id,
            auth.session.trainer_id,
            payload,
            { type: "client", id: auth.session.id }
        );
        return jsonOk({ request }, 201);
    } catch (err) {
        const msg = err instanceof Error ? err.message : "create_failed";
        if (msg === "request_already_active") {
            return jsonError(
                msg,
                "Hai già una richiesta in corso. Attendi la risposta del trainer.",
                409
            );
        }
        if (msg === "invalid_obiettivo") {
            return jsonError(msg, "Obiettivo non valido", 400);
        }
        console.error("[nutrition-requests] create failed", { err });
        return jsonError("server_error", "Errore interno", 500);
    }
}
