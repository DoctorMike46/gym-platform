"use server";

import { db } from "@/db";
import { clients, client_password_reset_tokens, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { sendClientPasswordResetEmail } from "@/lib/email";
import { validatePassword } from "@/lib/password-policy";
import { passwordResetLimiter, retryAfterSeconds } from "@/lib/rate-limit";
import { createClientSessionToken, CLIENT_COOKIE } from "@/lib/client-auth";

const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    || "http://localhost:3000";

export type ClientTokenValidation =
    | { valid: true; clientId: number }
    | { valid: false; reason: "expired" | "not_found" };

export async function requestClientPasswordReset(email: string) {
    try {
        const h = await headers();
        const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
        const rl = await passwordResetLimiter.limit(`portal:ip:${ip}:email:${email.toLowerCase()}`);
        if (!rl.success) {
            const retry = retryAfterSeconds(rl.reset);
            return { success: false, error: `Troppe richieste. Riprova tra ${retry} secondi.` };
        }

        const [client] = await db.select().from(clients).where(eq(clients.email, email)).limit(1);
        if (!client || !client.password_hash || !client.is_active) {
            await new Promise((r) => setTimeout(r, 200));
            return { success: true };
        }

        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await db
            .delete(client_password_reset_tokens)
            .where(eq(client_password_reset_tokens.client_id, client.id));
        await db.insert(client_password_reset_tokens).values({
            client_id: client.id,
            token,
            expires_at: expiresAt,
        });

        const [trainerSettings] = await db
            .select()
            .from(settings)
            .where(eq(settings.trainer_id, client.trainer_id))
            .limit(1);

        const resetLink = `${APP_URL}/portal/reset-password/${token}`;

        await sendClientPasswordResetEmail({
            email,
            clientName: client.nome || "Cliente",
            resetLink,
            platformName: trainerSettings?.site_name || "Ernesto Performance",
        });

        return { success: true };
    } catch (e) {
        console.error("Errore portal password reset:", e);
        return { success: false, error: "Errore durante la richiesta" };
    }
}

export async function validateClientResetToken(token: string): Promise<ClientTokenValidation> {
    try {
        const [record] = await db
            .select()
            .from(client_password_reset_tokens)
            .where(eq(client_password_reset_tokens.token, token))
            .limit(1);

        if (!record) return { valid: false, reason: "not_found" };
        if (record.expires_at.getTime() <= Date.now()) {
            return { valid: false, reason: "expired" };
        }
        return { valid: true, clientId: record.client_id };
    } catch {
        return { valid: false, reason: "not_found" };
    }
}

export async function resetClientPassword(token: string, password: string) {
    try {
        const policy = validatePassword(password);
        if (!policy.ok) {
            return { success: false, error: `Password non valida: ${policy.errors.join(", ")}` };
        }

        const result = await validateClientResetToken(token);
        if (!result.valid) {
            return { success: false, error: "Token non valido o scaduto" };
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await db
            .update(clients)
            .set({ password_hash: passwordHash, password_changed_at: new Date() })
            .where(eq(clients.id, result.clientId));

        await db
            .delete(client_password_reset_tokens)
            .where(eq(client_password_reset_tokens.token, token));

        return { success: true };
    } catch (e) {
        console.error("Errore reset client password:", e);
        return { success: false, error: "Errore durante il reset" };
    }
}

export type InviteValidation =
    | { valid: true; clientId: number; email: string; nome: string; cognome: string }
    | { valid: false; reason: "expired" | "not_found" | "already_active" };

export async function validateInviteToken(token: string): Promise<InviteValidation> {
    try {
        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.invite_token, token))
            .limit(1);

        if (!client) return { valid: false, reason: "not_found" };

        if (client.password_hash && client.password_set_at) {
            return { valid: false, reason: "already_active" };
        }

        if (
            !client.invite_token_expires_at ||
            client.invite_token_expires_at.getTime() <= Date.now()
        ) {
            return { valid: false, reason: "expired" };
        }

        return {
            valid: true,
            clientId: client.id,
            email: client.email,
            nome: client.nome,
            cognome: client.cognome,
        };
    } catch {
        return { valid: false, reason: "not_found" };
    }
}

export async function completeOnboarding(token: string, password: string, acceptTerms: boolean) {
    try {
        if (!acceptTerms) {
            return { success: false, error: "Devi accettare i termini per continuare" };
        }

        const policy = validatePassword(password);
        if (!policy.ok) {
            return { success: false, error: `Password non valida: ${policy.errors.join(", ")}` };
        }

        const result = await validateInviteToken(token);
        if (!result.valid) {
            const errorMap = {
                expired: "Il link di invito è scaduto",
                not_found: "Link di invito non valido",
                already_active: "Questo account è già attivo. Vai al login.",
            };
            return { success: false, error: errorMap[result.reason] };
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const now = new Date();

        const [updated] = await db
            .update(clients)
            .set({
                password_hash: passwordHash,
                password_set_at: now,
                password_changed_at: now,
                portal_terms_accepted_at: now,
                invite_token: null,
                invite_token_expires_at: null,
                is_active: true,
            })
            .where(eq(clients.id, result.clientId))
            .returning();

        if (!updated) return { success: false, error: "Errore aggiornamento" };

        const sessionToken = await createClientSessionToken({
            id: updated.id,
            trainer_id: updated.trainer_id,
            email: updated.email,
        });

        const cookieStore = await cookies();
        cookieStore.set(CLIENT_COOKIE, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
        });

        return { success: true };
    } catch (e) {
        console.error("Errore onboarding:", e);
        return { success: false, error: "Errore durante l'onboarding" };
    }
}
