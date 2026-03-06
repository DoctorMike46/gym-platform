"use server"

import { db } from "@/db";
import { subscriptions, clients, services } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedTrainer } from "@/lib/auth";

export async function createSubscription(data: {
    client_id: number;
    service_id: number;
    data_inizio: string;
}) {
    const trainer = await getAuthenticatedTrainer();
    try {
        if (!data.client_id || !data.service_id || !data.data_inizio) {
            return { error: "Dati incompleti" };
        }

        // Verifica che client e service appartengano al trainer
        const client = await db.query.clients.findFirst({
            where: and(eq(clients.id, data.client_id), eq(clients.trainer_id, trainer.id)),
        });
        if (!client) return { error: "Cliente non trovato o non autorizzato" };

        const serviceData = await db.query.services.findFirst({
            where: and(eq(services.id, data.service_id), eq(services.trainer_id, trainer.id)),
        });
        if (!serviceData) return { error: "Servizio non trovato o non autorizzato" };

        let data_fine = null;
        if (serviceData.durata_settimane) {
            const start = new Date(data.data_inizio);
            start.setDate(start.getDate() + (serviceData.durata_settimane * 7));
            data_fine = start.toISOString().split('T')[0];
        }

        await db.insert(subscriptions).values({
            client_id: data.client_id,
            service_id: data.service_id,
            data_inizio: data.data_inizio,
            data_fine: data_fine,
            status: "attivo",
        });
        revalidatePath("/clients");
        return { success: true };
    } catch (error) {
        console.error("Errore creazione abbonamento:", error);
        return { error: "Errore nel database" };
    }
}

export async function deleteSubscription(id: number, clientId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        // Verifica ownership del client
        const client = await db.query.clients.findFirst({
            where: and(eq(clients.id, clientId), eq(clients.trainer_id, trainer.id)),
        });
        if (!client) return { success: false };

        await db.update(subscriptions)
            .set({ status: "scaduto" })
            .where(and(eq(subscriptions.id, id), eq(subscriptions.client_id, clientId)));
        revalidatePath("/clients");
        revalidatePath(`/clients/${clientId}`);
        return { success: true };
    } catch (error) {
        console.error("Errore eliminazione abbonamento:", error);
        return { success: false };
    }
}

export async function renewSubscription(data: {
    client_id: number;
    service_id: number;
    data_inizio: string;
    old_id: number;
}) {
    const trainer = await getAuthenticatedTrainer();
    try {
        // Verifica ownership
        const client = await db.query.clients.findFirst({
            where: and(eq(clients.id, data.client_id), eq(clients.trainer_id, trainer.id)),
        });
        if (!client) return { success: false };

        const serviceData = await db.query.services.findFirst({
            where: and(eq(services.id, data.service_id), eq(services.trainer_id, trainer.id)),
        });
        if (!serviceData) return { success: false };

        // Scade il vecchio
        await db.update(subscriptions)
            .set({ status: "scaduto" })
            .where(and(eq(subscriptions.id, data.old_id), eq(subscriptions.client_id, data.client_id)));

        let data_fine = null;
        if (serviceData.durata_settimane) {
            const start = new Date(data.data_inizio);
            start.setDate(start.getDate() + (serviceData.durata_settimane * 7));
            data_fine = start.toISOString().split('T')[0];
        }

        // Crea il nuovo
        await db.insert(subscriptions).values({
            client_id: data.client_id,
            service_id: data.service_id,
            data_inizio: data.data_inizio,
            data_fine: data_fine,
            status: "attivo",
        });

        revalidatePath("/clients");
        revalidatePath(`/clients/${data.client_id}`);
        return { success: true };
    } catch (error) {
        console.error("Errore rinnovo abbonamento:", error);
        return { success: false };
    }
}
