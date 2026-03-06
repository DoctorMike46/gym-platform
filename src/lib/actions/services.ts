"use server"

import { db } from "@/db";
import { services } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";

export async function getServices() {
    try {
        return await db.select().from(services)
            .where(eq(services.is_active, true))
            .orderBy(desc(services.id));
    } catch (error) {
        console.error("Errore nel recupero servizi:", error);
        return [];
    }
}

export async function createService(formData: FormData) {
    try {
        const nome_servizio = formData.get("nome_servizio") as string;
        const categoria = formData.get("categoria") as string || "Generale";
        const prezzoInput = formData.get("prezzo") as string;
        const descrizione_breve = formData.get("descrizione_breve") as string;
        const caratteristiche = formData.get("caratteristiche") as string;
        const durata_settimane = formData.get("durata_settimane") ? parseInt(formData.get("durata_settimane") as string) : null;
        const include_coaching = formData.get("include_coaching") === "on";

        if (!nome_servizio || !prezzoInput) {
            console.error("Campi obbligatori mancanti");
            return { success: false, error: "Campi obbligatori mancanti" };
        }

        // Convert to cents (integer)
        const prezzo = Math.round(parseFloat(prezzoInput.replace(',', '.')) * 100);

        await db.insert(services).values({
            nome_servizio,
            categoria,
            prezzo,
            descrizione_breve,
            caratteristiche,
            durata_settimane,
            include_coaching,
        });

        revalidatePath("/services");
        return { success: true };
    } catch (error) {
        console.error("Errore creazione servizio:", error);
        return { success: false, error: "Errore interno server" };
    }
}

export async function updateService(id: number, formData: FormData) {
    try {
        const nome_servizio = formData.get("nome_servizio") as string;
        const categoria = formData.get("categoria") as string || "Generale";
        const prezzoInput = formData.get("prezzo") as string;
        const descrizione_breve = formData.get("descrizione_breve") as string;
        const caratteristiche = formData.get("caratteristiche") as string;
        const durata_settimane = formData.get("durata_settimane") ? parseInt(formData.get("durata_settimane") as string) : null;
        const include_coaching = formData.get("include_coaching") === "on";

        if (!nome_servizio || !prezzoInput) {
            console.error("Campi obbligatori mancanti");
            return { success: false, error: "Campi obbligatori mancanti" };
        }

        const prezzo = Math.round(parseFloat(prezzoInput.replace(',', '.')) * 100);

        await db.update(services).set({
            nome_servizio,
            categoria,
            prezzo,
            descrizione_breve,
            caratteristiche,
            durata_settimane,
            include_coaching,
        }).where(eq(services.id, id));

        revalidatePath("/services");
        return { success: true };
    } catch (error) {
        console.error("Errore aggiornamento servizio:", error);
        return { success: false, error: "Errore interno server" };
    }
}

export async function deleteService(id: number) {
    try {
        // Soft delete per non rompere abbonamenti storici
        await db.update(services).set({ is_active: false }).where(eq(services.id, id));
        revalidatePath("/services");
        return { success: true };
    } catch (error) {
        console.error("Errore eliminazione servizio:", error);
        return { success: false, error: "Errore interno server" };
    }
}
