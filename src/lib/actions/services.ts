"use server"

import { db } from "@/db";
import { services } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function getServices() {
    try {
        return await db.select().from(services);
    } catch (error) {
        console.error("Errore nel recupero servizi:", error);
        return [];
    }
}

export async function createService(formData: FormData) {
    try {
        const nome_servizio = formData.get("nome_servizio") as string;
        const prezzoInput = formData.get("prezzo") as string;
        const descrizione_breve = formData.get("descrizione_breve") as string;
        const durata_settimane = formData.get("durata_settimane") ? parseInt(formData.get("durata_settimane") as string) : null;
        const include_coaching = formData.get("include_coaching") === "on";

        if (!nome_servizio || !prezzoInput) {
            console.error("Campi obbligatori mancanti");
            return;
        }

        // Convert to cents (integer)
        const prezzo = Math.round(parseFloat(prezzoInput.replace(',', '.')) * 100);

        await db.insert(services).values({
            nome_servizio,
            prezzo,
            descrizione_breve,
            durata_settimane,
            include_coaching,
        });

        revalidatePath("/services");
    } catch (error) {
        console.error("Errore creazione servizio:", error);
    }
}
