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

export async function getClientById(id: number) {
    try {
        const client = await db.query.clients.findFirst({
            where: (clients, { eq }) => eq(clients.id, id),
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
    try {
        await db.delete(clients).where(eq(clients.id, id));
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
    try {
        await db.update(clients).set({ ...data, updated_at: new Date() }).where(eq(clients.id, id));
        revalidatePath("/clients");
        revalidatePath(`/clients/${id}`);
        return { success: true };
    } catch (error) {
        console.error("Errore aggiornamento cliente:", error);
        return { success: false };
    }
}
