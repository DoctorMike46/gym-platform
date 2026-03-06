"use server"

import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export async function createSubscription(data: {
    client_id: number;
    service_id: number;
    data_inizio: string;
}) {
    try {
        if (!data.client_id || !data.service_id || !data.data_inizio) {
            return { error: "Dati incompleti" };
        }

        // Recuperiamo il servizio per capire se ha durata
        const { services } = await import("@/db/schema");
        const serviceData = await db.query.services.findFirst({
            where: eq(services.id, data.service_id)
        });

        let data_fine = null;
        if (serviceData?.durata_settimane) {
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
    try {
        await db.update(subscriptions)
            .set({ status: "scaduto" })
            .where(eq(subscriptions.id, id));
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
    try {
        // Scade il vecchio
        await db.update(subscriptions)
            .set({ status: "scaduto" })
            .where(eq(subscriptions.id, data.old_id));

        // Recuperiamo il servizio
        const { services } = await import("@/db/schema");
        const serviceData = await db.query.services.findFirst({
            where: eq(services.id, data.service_id)
        });

        let data_fine = null;
        if (serviceData?.durata_settimane) {
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
