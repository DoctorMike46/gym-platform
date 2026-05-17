import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    updateNutritionPrefs,
    type UpdateNutritionPrefsInput,
} from "@/lib/services/profile.service";

export const runtime = "nodejs";

const MAX_LIST_LEN = 50;
const MAX_ITEM_LEN = 100;

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

export async function PATCH(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    let raw: UpdateNutritionPrefsInput;
    try {
        raw = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    let body: UpdateNutritionPrefsInput;
    try {
        body = {
            regime_alimentare:
                raw.regime_alimentare === undefined ? undefined : raw.regime_alimentare ?? null,
            allergeni: validateStringArray(raw.allergeni, "allergeni"),
            intolleranze: validateStringArray(raw.intolleranze, "intolleranze"),
            preferenze_alimenti: validateStringArray(raw.preferenze_alimenti, "preferenze_alimenti"),
            esclusioni_alimenti: validateStringArray(raw.esclusioni_alimenti, "esclusioni_alimenti"),
            note_aggiuntive:
                raw.note_aggiuntive === undefined ? undefined : raw.note_aggiuntive ?? null,
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : "invalid_body";
        return jsonError(msg, "Dati non validi", 400);
    }

    try {
        await updateNutritionPrefs(auth.session, body);
    } catch (err) {
        console.error("[profile/nutrition-prefs] update failed", { err });
        return jsonError("server_error", "Errore interno", 500);
    }

    return jsonOk({ updated: true });
}
