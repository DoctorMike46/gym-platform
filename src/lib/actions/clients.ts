"use server"

import { db } from "@/db";
import { clients, subscriptions, services } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export async function getClients() {
    try {
        const allClients = await db.query.clients.findMany({
            with: {
                subscriptions: {
                    with: {
                        service: true
                    }
                }
            },
            orderBy: (clients, { desc }) => [desc(clients.created_at)],
        });
        return allClients;
    } catch (error) {
        console.error("Errore nel recupero clienti:", error);
        return [];
    }
}

export async function createClient(formData: FormData) {
    try {
        const nome = formData.get("nome") as string;
        const cognome = formData.get("cognome") as string;
        const email = formData.get("email") as string;

        if (!nome || !cognome || !email) {
            console.error("Campi obbligatori mancanti");
            return;
        }

        await db.insert(clients).values({
            nome,
            cognome,
            email,
            anamnesi_status: "non firmato",
        });

        revalidatePath("/clients");
    } catch (error) {
        console.error("Errore creazione cliente:", error);
    }
}
