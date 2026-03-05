"use server"

import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createSubscription(data: {
    client_id: number;
    service_id: number;
    data_inizio: string;
    data_fine?: string;
}) {
    try {
        if (!data.client_id || !data.service_id || !data.data_inizio) {
            console.error("Dati abbonamento incompleti");
            return { error: "Dati incompleti" };
        }

        await db.insert(subscriptions).values({
            client_id: data.client_id,
            service_id: data.service_id,
            data_inizio: data.data_inizio,
            data_fine: data.data_fine,
            status: "attivo",
        });

        revalidatePath("/clients");
        return { success: true };
    } catch (error) {
        console.error("Errore creazione abbonamento:", error);
        return { error: "Errore nel database" };
    }
}
