"use server"

import { db } from "@/db";
import { trainers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getAllTrainers() {
    await requireAdmin();
    try {
        return await db.select({
            id: trainers.id,
            nome: trainers.nome,
            email: trainers.email,
            role: trainers.role,
            created_at: trainers.created_at
        }).from(trainers).orderBy(desc(trainers.created_at));
    } catch (error) {
        console.error("Errore recupero trainer:", error);
        return [];
    }
}

export async function createTrainer(data: { nome: string, email: string, password: string, role?: string }) {
    await requireAdmin();
    try {
        const hashedPassword = await bcrypt.hash(data.password, 10);

        await db.insert(trainers).values({
            nome: data.nome,
            email: data.email,
            password_hash: hashedPassword,
            role: data.role || "trainer"
        });

        revalidatePath("/admin");
        return { success: true };
    } catch (error: any) {
        console.error("Errore creazione trainer:", error);
        if (error.code === '23505') {
            return { success: false, error: "Email già registrata" };
        }
        return { success: false, error: "Errore durante la creazione" };
    }
}

export async function deleteTrainer(trainerId: number) {
    const session = await requireAdmin();

    // Non permettere di auto-eliminarsi
    if (session.id === trainerId) {
        return { success: false, error: "Non puoi eliminare il tuo stesso account" };
    }

    try {
        await db.delete(trainers).where(eq(trainers.id, trainerId));
        revalidatePath("/admin");
        return { success: true };
    } catch (error) {
        console.error("Errore eliminazione trainer:", error);
        return { success: false, error: "Errore durante l'eliminazione" };
    }
}
