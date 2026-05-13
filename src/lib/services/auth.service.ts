import { db } from "@/db";
import { client_password_reset_tokens, clients, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendClientPasswordResetEmail } from "@/lib/email";
import { passwordResetLimiter, retryAfterSeconds } from "@/lib/rate-limit";
import { validatePassword } from "@/lib/password-policy";

const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
        `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    "http://localhost:3000";

export interface AuthenticatedClient {
    id: number;
    trainer_id: number;
    email: string;
}

export type LoginResult =
    | { success: true; client: AuthenticatedClient }
    | { success: false; error: string; status: 401 | 429 | 500; retryAfter?: number };

/**
 * Verifica credenziali cliente e aggiorna last_login_at.
 * Non emette cookie né JWT — il chiamante decide il trasporto.
 */
export async function authenticateClient(params: {
    email: string;
    password: string;
    ipKey: string;
}): Promise<LoginResult> {
    const rl = await passwordResetLimiter.limit(`portal:login:ip:${params.ipKey}`);
    if (!rl.success) {
        return {
            success: false,
            error: "Troppi tentativi. Riprova più tardi.",
            status: 429,
            retryAfter: retryAfterSeconds(rl.reset),
        };
    }

    if (!params.email || !params.password) {
        return { success: false, error: "Email o password non corretti.", status: 401 };
    }

    const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.email, params.email))
        .limit(1);

    if (!client || !client.password_hash || !client.is_active) {
        return { success: false, error: "Email o password non corretti.", status: 401 };
    }

    const isValid = await bcrypt.compare(params.password, client.password_hash);
    if (!isValid) {
        return { success: false, error: "Email o password non corretti.", status: 401 };
    }

    await db.update(clients).set({ last_login_at: new Date() }).where(eq(clients.id, client.id));

    return {
        success: true,
        client: {
            id: client.id,
            trainer_id: client.trainer_id,
            email: client.email,
        },
    };
}

export type ClientPasswordResetResult =
    | { success: true }
    | { success: false; error: string; retryAfter?: number };

/**
 * Genera token di reset e invia email. Il chiamante deve fornire l'IP per il rate limit.
 */
export async function requestClientPasswordReset(params: {
    email: string;
    ipKey: string;
}): Promise<ClientPasswordResetResult> {
    try {
        const rl = await passwordResetLimiter.limit(
            `portal:ip:${params.ipKey}:email:${params.email.toLowerCase()}`
        );
        if (!rl.success) {
            return {
                success: false,
                error: `Troppe richieste. Riprova tra ${retryAfterSeconds(rl.reset)} secondi.`,
                retryAfter: retryAfterSeconds(rl.reset),
            };
        }

        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.email, params.email))
            .limit(1);

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
            email: params.email,
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

export type ClientTokenValidation =
    | { valid: true; clientId: number }
    | { valid: false; reason: "expired" | "not_found" };

export async function validateClientResetToken(
    token: string
): Promise<ClientTokenValidation> {
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

export type ResetClientPasswordResult =
    | { success: true }
    | { success: false; error: string };

export async function resetClientPassword(
    token: string,
    password: string
): Promise<ResetClientPasswordResult> {
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

export async function validateClientInviteToken(token: string): Promise<InviteValidation> {
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

export type CompleteOnboardingResult =
    | { success: true; client: AuthenticatedClient }
    | { success: false; error: string };

/**
 * Completa onboarding cliente. NON emette cookie né JWT — il chiamante
 * (Server Action o API REST) gestisce il trasporto della sessione.
 */
export async function completeClientOnboarding(
    token: string,
    password: string,
    consents: { terms: boolean; health: boolean; marketing: boolean }
): Promise<CompleteOnboardingResult> {
    try {
        if (!consents.terms) {
            return {
                success: false,
                error: "Devi accettare i Termini di Servizio e la Privacy Policy per continuare",
            };
        }
        if (!consents.health) {
            return {
                success: false,
                error: "Il consenso al trattamento dei dati di salute è necessario per usare il servizio",
            };
        }

        const policy = validatePassword(password);
        if (!policy.ok) {
            return { success: false, error: `Password non valida: ${policy.errors.join(", ")}` };
        }

        const result = await validateClientInviteToken(token);
        if (!result.valid) {
            const errorMap = {
                expired: "Il link di invito è scaduto",
                not_found: "Link di invito non valido",
                already_active: "Questo account è già attivo. Vai al login.",
            } as const;
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
                privacy_accepted_at: now,
                health_data_consent_at: now,
                marketing_consent_at: consents.marketing ? now : null,
                invite_token: null,
                invite_token_expires_at: null,
                is_active: true,
            })
            .where(eq(clients.id, result.clientId))
            .returning();

        if (!updated) return { success: false, error: "Errore aggiornamento" };

        return {
            success: true,
            client: {
                id: updated.id,
                trainer_id: updated.trainer_id,
                email: updated.email,
            },
        };
    } catch (e) {
        console.error("Errore onboarding:", e);
        return { success: false, error: "Errore durante l'onboarding" };
    }
}
