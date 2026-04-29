"use server";

import { db } from "@/db";
import { clients, settings, trainers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTrainer } from "@/lib/auth";
import { sendClientInviteEmail } from "@/lib/email";

const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    || "http://localhost:3000";

async function getClientForTrainer(clientId: number) {
    const trainer = await getAuthenticatedTrainer();
    const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.trainer_id, trainer.id)))
        .limit(1);
    if (!client) throw new Error("Cliente non trovato");
    return { trainer, client };
}

export async function inviteClient(clientId: number) {
    try {
        const { trainer, client } = await getClientForTrainer(clientId);

        if (!client.email) {
            return { success: false, error: "Il cliente non ha email" };
        }
        if (client.password_hash && client.password_set_at) {
            return { success: false, error: "L'account cliente è già attivo" };
        }

        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await db
            .update(clients)
            .set({
                invite_token: token,
                invite_token_expires_at: expiresAt,
                is_active: true,
            })
            .where(eq(clients.id, client.id));

        const [trainerSettings] = await db
            .select()
            .from(settings)
            .where(eq(settings.trainer_id, trainer.id))
            .limit(1);

        const [trainerRow] = await db
            .select({ nome: trainers.nome, email: trainers.email })
            .from(trainers)
            .where(eq(trainers.id, trainer.id))
            .limit(1);

        const inviteLink = `${APP_URL}/portal/onboarding/${token}`;

        await sendClientInviteEmail({
            clientEmail: client.email,
            clientName: client.nome || "Cliente",
            trainerName: trainerRow?.nome || trainerRow?.email || "Il tuo trainer",
            inviteLink,
            platformName: trainerSettings?.site_name || "Ernesto Performance",
        });

        revalidatePath(`/clients/${client.id}`);
        return { success: true };
    } catch (e) {
        console.error("Errore invito cliente:", e);
        return { success: false, error: e instanceof Error ? e.message : "Errore" };
    }
}

export async function resendInvite(clientId: number) {
    return inviteClient(clientId);
}

export async function revokePortalAccess(clientId: number) {
    try {
        const { client } = await getClientForTrainer(clientId);
        await db
            .update(clients)
            .set({
                is_active: false,
                invite_token: null,
                invite_token_expires_at: null,
            })
            .where(eq(clients.id, client.id));

        revalidatePath(`/clients/${client.id}`);
        return { success: true };
    } catch (e) {
        console.error("Errore revoke:", e);
        return { success: false, error: e instanceof Error ? e.message : "Errore" };
    }
}

export async function reactivatePortalAccess(clientId: number) {
    try {
        const { client } = await getClientForTrainer(clientId);
        await db.update(clients).set({ is_active: true }).where(eq(clients.id, client.id));
        revalidatePath(`/clients/${client.id}`);
        return { success: true };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Errore" };
    }
}

export async function getPortalStatus(clientId: number) {
    const { client } = await getClientForTrainer(clientId);
    let status: "never_invited" | "invited" | "expired" | "active" | "disabled" = "never_invited";

    if (!client.is_active) status = "disabled";
    else if (client.password_hash && client.password_set_at) status = "active";
    else if (client.invite_token && client.invite_token_expires_at) {
        status = client.invite_token_expires_at.getTime() > Date.now() ? "invited" : "expired";
    }

    return {
        status,
        last_login_at: client.last_login_at,
        invite_sent_at: client.invite_token_expires_at
            ? new Date(client.invite_token_expires_at.getTime() - 7 * 24 * 60 * 60 * 1000)
            : null,
    };
}
