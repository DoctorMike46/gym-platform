"use server"

import { db } from "@/db";
import { trainers, password_reset_tokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "@/lib/email";
import { getSettings } from "./settings";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function requestPasswordReset(email: string) {
    try {
        // 1. Find trainer
        const [trainer] = await db.select().from(trainers).where(eq(trainers.email, email)).limit(1);

        if (!trainer) {
            // Per sicurezza non riveliamo se l'email esiste
            return { success: true };
        }

        // 2. Generate token
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 ora

        // 3. Store token (delete existing tokens for this trainer first)
        await db.delete(password_reset_tokens).where(eq(password_reset_tokens.trainer_id, trainer.id));
        await db.insert(password_reset_tokens).values({
            trainer_id: trainer.id,
            token,
            expires_at: expiresAt,
        });

        // 4. Send email
        const settings = await getSettings();
        const resetLink = `${APP_URL}/reset-password?token=${token}`;

        await sendPasswordResetEmail({
            email,
            trainerName: trainer.nome || "Trainer",
            resetLink,
            platformName: settings?.site_name || "Ernesto Performance",
        });

        return { success: true };
    } catch (error) {
        console.error("Errore richiesta reset password:", error);
        return { success: false, error: "Errore durante la richiesta" };
    }
}

export async function validateResetToken(token: string) {
    try {
        const [record] = await db.select()
            .from(password_reset_tokens)
            .where(and(
                eq(password_reset_tokens.token, token),
                gt(password_reset_tokens.expires_at, new Date())
            ))
            .limit(1);

        return { valid: !!record, trainerId: record?.trainer_id };
    } catch {
        return { valid: false };
    }
}

export async function resetPassword(token: string, password: string) {
    try {
        // 1. Validate token again
        const { valid, trainerId } = await validateResetToken(token);
        if (!valid || !trainerId) {
            return { success: false, error: "Token non valido o scaduto" };
        }

        // 2. Hash new password
        const passwordHash = await bcrypt.hash(password, 10);

        // 3. Update trainer
        await db.update(trainers)
            .set({ password_hash: passwordHash })
            .where(eq(trainers.id, trainerId));

        // 4. Delete token
        await db.delete(password_reset_tokens).where(eq(password_reset_tokens.token, token));

        return { success: true };
    } catch (error) {
        console.error("Errore reset password:", error);
        return { success: false, error: "Errore durante il reset" };
    }
}
