import { db } from "@/db";
import { clients, services, settings, subscriptions } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/password-policy";
import type { ClientSession } from "@/lib/client-auth";

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
