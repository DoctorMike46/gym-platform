// Tipi e costanti per le richieste piano nutrizionale.
// NIENTE import server-only qui — questo file è importato anche da client
// components (nutrition-content.tsx, requests-tab.tsx, request-detail-dialog.tsx).

export const REQUEST_STATUSES = ["pending", "in_review", "approved", "declined"] as const;
export type NutritionRequestStatus = typeof REQUEST_STATUSES[number];

export const OBIETTIVI = [
    "dimagrimento",
    "massa",
    "mantenimento",
    "performance",
    "salute",
    "ricomposizione",
] as const;
export type Obiettivo = typeof OBIETTIVI[number];

export interface NutritionRequestSnapshot {
    obiettivo: Obiettivo | null;
    timeframe_settimane: number | null;
    peso_target_kg: string | null;
    motivazione: string | null;
    regime_alimentare: string | null;
    allergeni: string[] | null;
    intolleranze: string[] | null;
    cibi_preferiti: string[] | null;
    cibi_evitati: string[] | null;
    n_pasti_die: number | null;
    orari_pasti: string[] | null;
    occasioni_sociali: number | null;
    ore_sonno: number | null;
    livello_stress: number | null;
    consumo_acqua_litri: string | null;
    fumo: string | null;
    integratori: Array<{ nome: string; dosaggio?: string | null }> | null;
    patologie: string | null;
    farmaci: string | null;
    note_libere: string | null;
}

export interface NutritionRequest extends NutritionRequestSnapshot {
    id: number;
    client_id: number;
    trainer_id: number;
    status: NutritionRequestStatus;
    trainer_decline_reason: string | null;
    trainer_internal_note: string | null;
    linked_meal_plan_id: number | null;
    requested_at: Date;
    reviewed_at: Date | null;
    decided_at: Date | null;
}

export interface NutritionRequestListItem {
    id: number;
    client_id: number;
    client_nome: string;
    client_cognome: string;
    status: NutritionRequestStatus;
    obiettivo: Obiettivo | null;
    timeframe_settimane: number | null;
    requested_at: Date;
    decided_at: Date | null;
}

export interface CreateRequestInput {
    obiettivo: Obiettivo;
    timeframe_settimane?: number | null;
    peso_target_kg?: string | null;
    motivazione?: string | null;
    regime_alimentare?: string | null;
    allergeni?: string[] | null;
    intolleranze?: string[] | null;
    cibi_preferiti?: string[] | null;
    cibi_evitati?: string[] | null;
    n_pasti_die?: number | null;
    orari_pasti?: string[] | null;
    occasioni_sociali?: number | null;
    ore_sonno?: number | null;
    livello_stress?: number | null;
    consumo_acqua_litri?: string | null;
    fumo?: string | null;
    integratori?: Array<{ nome: string; dosaggio?: string | null }> | null;
    patologie?: string | null;
    farmaci?: string | null;
    note_libere?: string | null;
}

export interface ListRequestsFilters {
    status?: NutritionRequestStatus;
    clientId?: number;
    fromDate?: Date;
    toDate?: Date;
}
