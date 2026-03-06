"use server"

import { db } from "@/db";
import { clients, subscriptions } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedTrainer } from "@/lib/auth";

export async function getClients() {
    const trainer = await getAuthenticatedTrainer();
    try {
        const allClients = await db.query.clients.findMany({
            where: eq(clients.trainer_id, trainer.id),
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
    const trainer = await getAuthenticatedTrainer();
    try {
        const nome = formData.get("nome") as string;
        const cognome = formData.get("cognome") as string;
        const email = formData.get("email") as string;

        if (!nome || !cognome || !email) {
            console.error("Campi obbligatori mancanti");
            return { success: false, error: "Campi obbligatori mancanti" };
        }

        await db.insert(clients).values({
            trainer_id: trainer.id,
            nome,
            cognome,
            email,
            anamnesi_status: "non firmato",
        });

        revalidatePath("/clients");
        return { success: true };
    } catch (error: any) {
        console.error("Errore creazione cliente:", error);
        return { success: false, error: error.message || "Errore sconosciuto" };
    }
}

export async function getClientById(id: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const client = await db.query.clients.findFirst({
            where: and(eq(clients.id, id), eq(clients.trainer_id, trainer.id)),
            with: {
                subscriptions: {
                    with: { service: true },
                },
                workout_assignments: {
                    with: { template: true },
                    orderBy: (assignments, { desc }) => [desc(assignments.data_assegnazione)],
                }
            }
        });
        return client ?? null;
    } catch (error) {
        console.error("Errore nel recupero cliente:", error);
        return null;
    }
}

export async function deleteClient(id: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await db.delete(clients).where(and(eq(clients.id, id), eq(clients.trainer_id, trainer.id)));
        revalidatePath("/clients");
        return { success: true };
    } catch (error) {
        console.error("Errore eliminazione cliente:", error);
        return { success: false };
    }
}

export async function updateClient(id: number, data: {
    nome?: string;
    cognome?: string;
    email?: string;
    peso?: string;
    altezza?: string;
    eta?: number;
    note?: string;
    data_di_nascita?: string;
}) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await db.update(clients).set({ ...data, updated_at: new Date() }).where(and(eq(clients.id, id), eq(clients.trainer_id, trainer.id)));
        revalidatePath("/clients");
        revalidatePath(`/clients/${id}`);
        return { success: true };
    } catch (error) {
        console.error("Errore aggiornamento cliente:", error);
        return { success: false };
    }
}
