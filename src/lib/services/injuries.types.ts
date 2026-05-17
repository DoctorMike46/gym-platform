// Tipi e costanti per gli infortuni cliente. NIENTE import server-only qui
// (db, audit-log, crypto) — questo file è importato anche da client components
// (es. injuries-card.tsx, injury-banner.tsx).

export const BODY_PARTS = [
    "spalla_sx", "spalla_dx",
    "gomito_sx", "gomito_dx",
    "polso_sx", "polso_dx",
    "mano",
    "schiena_lombare", "schiena_dorsale", "schiena_cervicale",
    "collo",
    "anca_sx", "anca_dx",
    "ginocchio_sx", "ginocchio_dx",
    "caviglia_sx", "caviglia_dx",
    "piede",
    "altro",
] as const;
export type BodyPart = typeof BODY_PARTS[number];

export const INJURY_TYPES = ["muscolare", "articolare", "tendine", "osseo", "altro"] as const;
export type InjuryType = typeof INJURY_TYPES[number];

export const INJURY_GRAVITA = ["leggera", "media", "grave"] as const;
export type InjuryGravita = typeof INJURY_GRAVITA[number];

export const INJURY_STATO = ["attivo", "recuperato"] as const;
export type InjuryStato = typeof INJURY_STATO[number];

export interface ClientInjury {
    id: number;
    client_id: number;
    parte_corpo: BodyPart;
    tipo: InjuryType | null;
    gravita: InjuryGravita;
    stato: InjuryStato;
    data_evento: string | null;
    data_recupero: string | null;
    note: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateInjuryInput {
    parte_corpo: BodyPart;
    tipo?: InjuryType | null;
    gravita: InjuryGravita;
    stato?: InjuryStato;
    data_evento?: string | null;
    data_recupero?: string | null;
    note?: string | null;
}

export interface UpdateInjuryInput {
    parte_corpo?: BodyPart;
    tipo?: InjuryType | null;
    gravita?: InjuryGravita;
    stato?: InjuryStato;
    data_evento?: string | null;
    data_recupero?: string | null;
    note?: string | null;
}
