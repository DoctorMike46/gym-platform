"use server";

import { db } from "@/db";
import { clients, subscriptions, services } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireClientAuth } from "@/lib/client-auth";
import { validatePassword } from "@/lib/password-policy";
import { revalidatePath } from "next/cache";

export async function getMyProfile() {
    const session = await requireClientAuth();
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
    return client;
}

export async function updateMyProfile(input: { telefono?: string }) {
    const session = await requireClientAuth();
    await db
        .update(clients)
        .set({
            telefono: input.telefono ?? null,
            updated_at: new Date(),
        })
        .where(eq(clients.id, session.id));
    revalidatePath("/portal/profile");
    return { success: true };
}

export async function changeMyPassword(currentPassword: string, newPassword: string) {
    const session = await requireClientAuth();
    const [client] = await db
        .select({ password_hash: clients.password_hash })
        .from(clients)
        .where(eq(clients.id, session.id))
        .limit(1);

    if (!client?.password_hash) return { success: false, error: "Account non valido" };

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

export async function getMyActiveSubscription() {
    const session = await requireClientAuth();
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
