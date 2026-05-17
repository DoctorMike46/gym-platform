import { db } from "@/db";
import {
    client_nutrition_profile,
    clients,
    services,
    settings,
    subscriptions,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/password-policy";
import { decryptOptional, encryptOptional } from "@/lib/crypto";
import type { ClientSession } from "@/lib/client-auth";
import { getLifestyle, type LifestyleData } from "./lifestyle.service";
import {
    getMedicalHistory,
    type MedicalHistory,
} from "./medical.service";
import {
    listInjuriesByClient,
    type ClientInjury,
} from "./injuries.service";
import { getActiveRequestForClient, type NutritionRequest } from "./nutrition-requests.service";
import type { AuditActor } from "@/lib/audit-log";

export async function getClientProfile(session: ClientSession) {
    const [client] = await db
        .select({
            id: clients.id,
            nome: clients.nome,
            cognome: clients.cognome,
            email: clients.email,
            telefono: clients.telefono,
            peso: clients.peso,
            altezza: clients.altezza,
            eta: clients.eta,
            data_di_nascita: clients.data_di_nascita,
            anamnesi_status: clients.anamnesi_status,
            created_at: clients.created_at,
        })
        .from(clients)
        .where(eq(clients.id, session.id))
        .limit(1);
    return client ?? null;
}

export interface ClientProfileUpdate {
    telefono?: string | null;
}

export async function updateClientProfile(session: ClientSession, input: ClientProfileUpdate) {
    await db
        .update(clients)
        .set({
            telefono: input.telefono ?? null,
            updated_at: new Date(),
        })
        .where(eq(clients.id, session.id));
    return { success: true as const };
}

export type ChangePasswordResult =
    | { success: true }
    | { success: false; error: string };

export async function changeClientPassword(
    session: ClientSession,
    currentPassword: string,
    newPassword: string
): Promise<ChangePasswordResult> {
    const [client] = await db
        .select({ password_hash: clients.password_hash })
        .from(clients)
        .where(eq(clients.id, session.id))
        .limit(1);

    if (!client?.password_hash) {
        return { success: false, error: "Account non valido" };
    }

    const ok = await bcrypt.compare(currentPassword, client.password_hash);
    if (!ok) return { success: false, error: "Password attuale non corretta" };

    const policy = validatePassword(newPassword);
    if (!policy.ok) {
        return { success: false, error: `Password non valida: ${policy.errors.join(", ")}` };
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db
        .update(clients)
        .set({ password_hash: hash, password_changed_at: new Date() })
        .where(eq(clients.id, session.id));

    return { success: true };
}

export async function getClientActiveSubscription(session: ClientSession) {
    const rows = await db
        .select({
            sub: subscriptions,
            service: services,
        })
        .from(subscriptions)
        .leftJoin(services, eq(services.id, subscriptions.service_id))
        .where(and(eq(subscriptions.client_id, session.id), eq(subscriptions.status, "attivo")))
        .orderBy(desc(subscriptions.data_inizio))
        .limit(1);
    return rows[0] || null;
}

export async function getClientSubscriptionsHistory(session: ClientSession) {
    return db
        .select({
            sub: subscriptions,
            service: services,
        })
        .from(subscriptions)
        .leftJoin(services, eq(services.id, subscriptions.service_id))
        .where(eq(subscriptions.client_id, session.id))
        .orderBy(desc(subscriptions.data_inizio));
}

export interface TrainerBranding {
    site_name: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string | null;
}

export async function getTrainerBranding(session: ClientSession): Promise<TrainerBranding | null> {
    const [row] = await db
        .select({
            site_name: settings.site_name,
            logo_url: settings.logo_url,
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
        })
        .from(settings)
        .where(eq(settings.trainer_id, session.trainer_id))
        .limit(1);
    return row ?? null;
}

// ─── Extended profile (per app mobile cliente) ──────────────────────

export interface PhysicalData {
    peso: string | null;
    altezza: string | null;
    eta: number | null;
    data_di_nascita: string | null;
    sesso: string | null;          // 'M' | 'F' | 'altro'
    livello_attivita: string | null;
}

export interface GoalData {
    obiettivo: string | null;       // obiettivo_default da nutrition_profile
    timeframe_settimane: number | null;
    peso_target_kg: string | null;
    motivazione: string | null;
}

export interface NutritionPreferences {
    regime_alimentare: string | null;
    allergeni: string[] | null;
    intolleranze: string[] | null;
    preferenze_alimenti: string[] | null;
    esclusioni_alimenti: string[] | null;
    note_aggiuntive: string | null;
}

export interface ExtendedProfile {
    id: number;
    nome: string;
    cognome: string;
    email: string;
    telefono: string | null;
    anamnesi_status: string;
    health_data_consent_at: Date | null;
    physical: PhysicalData;
    goals: GoalData;
    nutrition_preferences: NutritionPreferences;
    lifestyle: LifestyleData;
    medical_history: MedicalHistory;
    injuries: ClientInjury[];
    active_nutrition_request: NutritionRequest | null;
}

/**
 * Aggrega tutti i dati di profilo del cliente in un'unica payload per la home
 * mobile della sezione Profilo. Le letture di dati sanitari sono auditate dai
 * service sottostanti (medical, injuries, lifestyle).
 */
export async function getExtendedProfile(session: ClientSession): Promise<ExtendedProfile | null> {
    const [client] = await db
        .select({
            id: clients.id,
            nome: clients.nome,
            cognome: clients.cognome,
            email: clients.email,
            telefono: clients.telefono,
            peso: clients.peso,
            altezza: clients.altezza,
            eta: clients.eta,
            data_di_nascita: clients.data_di_nascita,
            anamnesi_status: clients.anamnesi_status,
            health_data_consent_at: clients.health_data_consent_at,
        })
        .from(clients)
        .where(eq(clients.id, session.id))
        .limit(1);

    if (!client) return null;

    const [nutritionProfile] = await db
        .select()
        .from(client_nutrition_profile)
        .where(eq(client_nutrition_profile.client_id, client.id))
        .limit(1);

    let pesoTarget: string | null = null;
    try {
        pesoTarget = decryptOptional(nutritionProfile?.peso_target_kg_enc ?? null);
    } catch (err) {
        console.error("[profile] peso_target decrypt failed", { err });
    }

    const actor: AuditActor = { type: "client", id: session.id };

    const [lifestyle, medical_history, injuries, active_nutrition_request] = await Promise.all([
        getLifestyle(session.id, actor),
        getMedicalHistory(session.id, actor),
        listInjuriesByClient(session.id, actor),
        getActiveRequestForClient(session.id),
    ]);

    const intolleranzeArr: string[] | null = nutritionProfile?.intolleranze_json
        ? (nutritionProfile.intolleranze_json as string[])
        : nutritionProfile?.intolleranze
            ? nutritionProfile.intolleranze
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
            : null;

    return {
        id: client.id,
        nome: client.nome,
        cognome: client.cognome,
        email: client.email,
        telefono: client.telefono,
        anamnesi_status: client.anamnesi_status,
        health_data_consent_at: client.health_data_consent_at,
        physical: {
            peso: client.peso,
            altezza: client.altezza,
            eta: client.eta,
            data_di_nascita: client.data_di_nascita,
            sesso: nutritionProfile?.sesso ?? null,
            livello_attivita: nutritionProfile?.livello_attivita ?? null,
        },
        goals: {
            obiettivo: nutritionProfile?.obiettivo_default ?? null,
            timeframe_settimane: nutritionProfile?.obiettivo_timeframe_settimane ?? null,
            peso_target_kg: pesoTarget,
            motivazione: nutritionProfile?.motivazione ?? null,
        },
        nutrition_preferences: {
            regime_alimentare: nutritionProfile?.regime_alimentare ?? null,
            allergeni: (nutritionProfile?.allergeni as string[] | null) ?? null,
            intolleranze: intolleranzeArr,
            preferenze_alimenti: (nutritionProfile?.preferenze_alimenti as string[] | null) ?? null,
            esclusioni_alimenti: (nutritionProfile?.esclusioni_alimenti as string[] | null) ?? null,
            note_aggiuntive: nutritionProfile?.note_aggiuntive ?? null,
        },
        lifestyle,
        medical_history,
        injuries,
        active_nutrition_request,
    };
}

// ─── Section-level patches (mobile) ─────────────────────────────────

const SESSO_VALUES = ["M", "F", "altro"] as const;
const LIVELLO_ATTIVITA_VALUES = [
    "sedentario",
    "leggero",
    "moderato",
    "intenso",
    "molto_intenso",
] as const;

export interface UpdatePhysicalInput {
    peso?: string | null;
    altezza?: string | null;
    eta?: number | null;
    data_di_nascita?: string | null;
    sesso?: (typeof SESSO_VALUES)[number] | null;
    livello_attivita?: (typeof LIVELLO_ATTIVITA_VALUES)[number] | null;
}

/**
 * Aggiorna dati fisici: peso/altezza/eta/data_di_nascita su `clients`,
 * sesso/livello_attivita su `client_nutrition_profile` (upsert).
 */
export async function updatePhysical(
    session: ClientSession,
    input: UpdatePhysicalInput
): Promise<void> {
    if (input.sesso !== undefined && input.sesso !== null && !SESSO_VALUES.includes(input.sesso)) {
        throw new Error("invalid_sesso");
    }
    if (
        input.livello_attivita !== undefined &&
        input.livello_attivita !== null &&
        !LIVELLO_ATTIVITA_VALUES.includes(input.livello_attivita)
    ) {
        throw new Error("invalid_livello_attivita");
    }

    const clientPatch: Partial<typeof clients.$inferInsert> = {};
    if (input.peso !== undefined) clientPatch.peso = input.peso;
    if (input.altezza !== undefined) clientPatch.altezza = input.altezza;
    if (input.eta !== undefined) clientPatch.eta = input.eta;
    if (input.data_di_nascita !== undefined) clientPatch.data_di_nascita = input.data_di_nascita;

    if (Object.keys(clientPatch).length > 0) {
        clientPatch.updated_at = new Date();
        await db.update(clients).set(clientPatch).where(eq(clients.id, session.id));
    }

    if (input.sesso !== undefined || input.livello_attivita !== undefined) {
        await upsertNutritionProfilePartial(session, {
            ...(input.sesso !== undefined ? { sesso: input.sesso } : {}),
            ...(input.livello_attivita !== undefined ? { livello_attivita: input.livello_attivita } : {}),
        });
    }
}

export interface UpdateGoalsInput {
    obiettivo?: string | null;          // obiettivo_default
    timeframe_settimane?: number | null;
    peso_target_kg?: string | null;
    motivazione?: string | null;
}

export async function updateGoals(
    session: ClientSession,
    input: UpdateGoalsInput
): Promise<void> {
    await upsertNutritionProfilePartial(session, {
        ...(input.obiettivo !== undefined ? { obiettivo_default: input.obiettivo } : {}),
        ...(input.timeframe_settimane !== undefined
            ? { obiettivo_timeframe_settimane: input.timeframe_settimane }
            : {}),
        ...(input.peso_target_kg !== undefined
            ? { peso_target_kg_enc: encryptOptional(input.peso_target_kg) }
            : {}),
        ...(input.motivazione !== undefined ? { motivazione: input.motivazione } : {}),
    });
}

export interface UpdateNutritionPrefsInput {
    regime_alimentare?: string | null;
    allergeni?: string[] | null;
    intolleranze?: string[] | null;
    preferenze_alimenti?: string[] | null;
    esclusioni_alimenti?: string[] | null;
    note_aggiuntive?: string | null;
}

export async function updateNutritionPrefs(
    session: ClientSession,
    input: UpdateNutritionPrefsInput
): Promise<void> {
    await upsertNutritionProfilePartial(session, {
        ...(input.regime_alimentare !== undefined
            ? { regime_alimentare: input.regime_alimentare }
            : {}),
        ...(input.allergeni !== undefined ? { allergeni: input.allergeni } : {}),
        ...(input.intolleranze !== undefined
            ? {
                  intolleranze_json: input.intolleranze,
                  // mantieni colonna legacy in sync per 1 release
                  intolleranze: input.intolleranze?.join(", ") ?? null,
              }
            : {}),
        ...(input.preferenze_alimenti !== undefined
            ? { preferenze_alimenti: input.preferenze_alimenti }
            : {}),
        ...(input.esclusioni_alimenti !== undefined
            ? { esclusioni_alimenti: input.esclusioni_alimenti }
            : {}),
        ...(input.note_aggiuntive !== undefined ? { note_aggiuntive: input.note_aggiuntive } : {}),
    });
}

/**
 * Upsert parziale di client_nutrition_profile. Non audita: chiamato da updatePhysical/Goals/Prefs.
 */
async function upsertNutritionProfilePartial(
    session: ClientSession,
    patch: Partial<typeof client_nutrition_profile.$inferInsert>
): Promise<void> {
    if (Object.keys(patch).length === 0) return;

    const [existing] = await db
        .select({ id: client_nutrition_profile.id })
        .from(client_nutrition_profile)
        .where(eq(client_nutrition_profile.client_id, session.id))
        .limit(1);

    if (existing) {
        await db
            .update(client_nutrition_profile)
            .set({ ...patch, updated_at: new Date() })
            .where(eq(client_nutrition_profile.id, existing.id));
    } else {
        await db.insert(client_nutrition_profile).values({
            client_id: session.id,
            trainer_id: session.trainer_id,
            ...patch,
        });
    }
}
