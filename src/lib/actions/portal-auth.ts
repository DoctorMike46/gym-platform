"use server";

import { cookies, headers } from "next/headers";
import { CLIENT_COOKIE, createClientSessionToken } from "@/lib/client-auth";
import {
    completeClientOnboarding,
    requestClientPasswordReset as requestClientPasswordResetService,
    resetClientPassword as resetClientPasswordService,
    validateClientInviteToken,
    validateClientResetToken as validateClientResetTokenService,
    type ClientTokenValidation,
    type InviteValidation,
} from "@/lib/services/auth.service";

export type { ClientTokenValidation, InviteValidation };

async function getRequestIp(): Promise<string> {
    const h = await headers();
    return (
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        "unknown"
    );
}

export async function requestClientPasswordReset(email: string) {
    const ipKey = await getRequestIp();
    return requestClientPasswordResetService({ email, ipKey });
}

export async function validateClientResetToken(token: string): Promise<ClientTokenValidation> {
    return validateClientResetTokenService(token);
}

export async function resetClientPassword(token: string, password: string) {
    return resetClientPasswordService(token, password);
}

export async function validateInviteToken(token: string): Promise<InviteValidation> {
    return validateClientInviteToken(token);
}

export async function completeOnboarding(
    token: string,
    password: string,
    acceptTerms: boolean
): Promise<{ success: true } | { success: false; error: string }> {
    const result = await completeClientOnboarding(token, password, acceptTerms);
    if (!result.success) return result;

    const sessionToken = await createClientSessionToken(result.client);
    const cookieStore = await cookies();
    cookieStore.set(CLIENT_COOKIE, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
    });
    return { success: true };
}
