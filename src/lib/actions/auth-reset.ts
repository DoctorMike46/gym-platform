"use server"

import { db } from "@/db";
import { trainers, password_reset_tokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { sendPasswordResetEmail } from "@/lib/email";
import { getSettings } from "./settings";
import { validatePassword } from "@/lib/password-policy";
import { passwordResetLimiter, retryAfterSeconds } from "@/lib/rate-limit";

const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    || "http://localhost:3000";

export type TokenValidation =
    | { valid: true; trainerId: number }
    | { valid: false; reason: "expired" | "not_found" };

export async function requestPasswordReset(email: string) {
    try {
        const h = await headers();
        const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim()
            || h.get("x-real-ip")
            || "unknown";

        const rl = await passwordResetLimiter.limit(`ip:${ip}:email:${email.toLowerCase()}`);
        if (!rl.success) {
            const retry = retryAfterSeconds(rl.reset);
            return { success: false, error: `Troppe richieste. Riprova tra ${retry} secondi.` };
        }

        const [trainer] = await db.select().from(trainers).where(eq(trainers.email, email)).limit(1);

        if (!trainer) {
            // Timing equalization: simulate the work of a real reset
            await new Promise((r) => setTimeout(r, 200));
            return { success: true };
        }

        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await db.delete(password_reset_tokens).where(eq(password_reset_tokens.trainer_id, trainer.id));
        await db.insert(password_reset_tokens).values({
            trainer_id: trainer.id,
            token,
            expires_at: expiresAt,
        });

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

export async function validateResetToken(token: string): Promise<TokenValidation> {
    try {
        const [record] = await db
            .select()
            .from(password_reset_tokens)
            .where(eq(password_reset_tokens.token, token))
            .limit(1);

        if (!record) return { valid: false, reason: "not_found" };
        if (record.expires_at.getTime() <= Date.now()) {
            return { valid: false, reason: "expired" };
        }

        return { valid: true, trainerId: record.trainer_id };
    } catch {
        return { valid: false, reason: "not_found" };
    }
}

export async function resetPassword(token: string, password: string) {
    try {
        const policy = validatePassword(password);
        if (!policy.ok) {
            return { success: false, error: `Password non valida: ${policy.errors.join(", ")}` };
        }

        const result = await validateResetToken(token);
        if (!result.valid) {
            return { success: false, error: "Token non valido o scaduto" };
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await db
            .update(trainers)
            .set({ password_hash: passwordHash, password_changed_at: new Date() })
            .where(eq(trainers.id, result.trainerId));

        await db.delete(password_reset_tokens).where(eq(password_reset_tokens.token, token));

        return { success: true };
    } catch (error) {
        console.error("Errore reset password:", error);
        return { success: false, error: "Errore durante il reset" };
    }
}
