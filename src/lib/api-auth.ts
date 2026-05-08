import { jwtVerify, SignJWT } from "jose";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { client_refresh_tokens, clients } from "@/db/schema";
import { and, eq, isNull, lt } from "drizzle-orm";
import type { ClientSession } from "@/lib/client-auth";

function getJwtSecret(): Uint8Array {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 32) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("JWT_SECRET must be set and >=32 chars in production");
        }
        return new TextEncoder().encode("dev-secret-change-in-production-32ch");
    }
    return new TextEncoder().encode(s);
}

const JWT_SECRET = getJwtSecret();

const MOBILE_AUDIENCE = "client-mobile";
const ACCESS_TOKEN_TTL_SECONDS = 60 * 15; // 15 minuti
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 giorni

export interface IssuedTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: "Bearer";
}

export async function createAccessToken(client: {
    id: number;
    trainer_id: number;
    email: string;
}): Promise<string> {
    return new SignJWT({
        sub: String(client.id),
        trainer_id: client.trainer_id,
        email: client.email,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setAudience(MOBILE_AUDIENCE)
        .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
        .sign(JWT_SECRET);
}

function hashRefreshToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Genera coppia (access, refresh). Persiste l'hash del refresh in DB.
 */
export async function issueTokensForClient(
    client: { id: number; trainer_id: number; email: string },
    meta: { device_id?: string | null; user_agent?: string | null }
): Promise<IssuedTokens> {
    const access = await createAccessToken(client);

    const refresh = crypto.randomUUID() + crypto.randomBytes(16).toString("hex");
    const tokenHash = hashRefreshToken(refresh);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await db.insert(client_refresh_tokens).values({
        client_id: client.id,
        token_hash: tokenHash,
        device_id: meta.device_id ?? null,
        user_agent: meta.user_agent ?? null,
        expires_at: expiresAt,
    });

    return {
        access_token: access,
        refresh_token: refresh,
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        token_type: "Bearer",
    };
}

export type RotateRefreshResult =
    | { success: true; tokens: IssuedTokens }
    | { success: false; error: "invalid" | "expired" | "revoked" };

/**
 * Rotation: verifica refresh token, lo revoca, ne emette uno nuovo.
 * Riusa il device_id del precedente.
 */
export async function rotateRefreshToken(
    rawRefreshToken: string,
    meta: { user_agent?: string | null }
): Promise<RotateRefreshResult> {
    const tokenHash = hashRefreshToken(rawRefreshToken);

    const [record] = await db
        .select()
        .from(client_refresh_tokens)
        .where(eq(client_refresh_tokens.token_hash, tokenHash))
        .limit(1);

    if (!record) return { success: false, error: "invalid" };
    if (record.revoked_at) return { success: false, error: "revoked" };
    if (record.expires_at.getTime() <= Date.now()) {
        return { success: false, error: "expired" };
    }

    const [client] = await db
        .select({
            id: clients.id,
            trainer_id: clients.trainer_id,
            email: clients.email,
            is_active: clients.is_active,
        })
        .from(clients)
        .where(eq(clients.id, record.client_id))
        .limit(1);

    if (!client || !client.is_active) {
        return { success: false, error: "invalid" };
    }

    await db
        .update(client_refresh_tokens)
        .set({ revoked_at: new Date(), last_used_at: new Date() })
        .where(eq(client_refresh_tokens.id, record.id));

    const newTokens = await issueTokensForClient(
        { id: client.id, trainer_id: client.trainer_id, email: client.email },
        { device_id: record.device_id, user_agent: meta.user_agent ?? null }
    );

    return { success: true, tokens: newTokens };
}

export async function revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    await db
        .update(client_refresh_tokens)
        .set({ revoked_at: new Date() })
        .where(
            and(
                eq(client_refresh_tokens.token_hash, tokenHash),
                isNull(client_refresh_tokens.revoked_at)
            )
        );
}

export async function revokeAllRefreshTokensForClient(clientId: number): Promise<void> {
    await db
        .update(client_refresh_tokens)
        .set({ revoked_at: new Date() })
        .where(
            and(
                eq(client_refresh_tokens.client_id, clientId),
                isNull(client_refresh_tokens.revoked_at)
            )
        );
}

export async function pruneExpiredRefreshTokens(): Promise<void> {
    await db
        .delete(client_refresh_tokens)
        .where(lt(client_refresh_tokens.expires_at, new Date()));
}

// ───────────────────────── REQUEST AUTH ─────────────────────────

export type ApiAuthResult =
    | { ok: true; session: ClientSession }
    | { ok: false; status: 401; error: string };

export async function verifyBearerToken(req: NextRequest): Promise<ApiAuthResult> {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
        return { ok: false, status: 401, error: "missing_token" };
    }

    const token = authHeader.slice(7).trim();
    if (!token) return { ok: false, status: 401, error: "missing_token" };

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET, {
            audience: MOBILE_AUDIENCE,
        });

        const id = Number(payload.sub);
        const trainer_id = Number(payload.trainer_id);
        const email = payload.email as string;
        const iat = payload.iat as number | undefined;

        if (!id || !email || !trainer_id) {
            return { ok: false, status: 401, error: "invalid_token" };
        }

        if (iat) {
            const [client] = await db
                .select({
                    password_changed_at: clients.password_changed_at,
                    is_active: clients.is_active,
                })
                .from(clients)
                .where(eq(clients.id, id))
                .limit(1);

            if (!client || !client.is_active) {
                return { ok: false, status: 401, error: "account_disabled" };
            }
            // Tolleranza di 1s: iat è in secondi (floor), password_changed_at in ms
            if (
                client.password_changed_at &&
                iat * 1000 + 1000 < client.password_changed_at.getTime()
            ) {
                return { ok: false, status: 401, error: "session_invalidated" };
            }
        }

        return { ok: true, session: { id, trainer_id, email } };
    } catch {
        return { ok: false, status: 401, error: "invalid_token" };
    }
}

/**
 * Wrapper per route handler: estrae sessione o ritorna 401 JSON.
 * Usage:
 *   export async function GET(req: NextRequest) {
 *     const auth = await requireApiClientAuth(req);
 *     if (auth instanceof NextResponse) return auth;
 *     // ... usa auth.session
 *   }
 */
export async function requireApiClientAuth(
    req: NextRequest
): Promise<{ session: ClientSession } | NextResponse> {
    const result = await verifyBearerToken(req);
    if (!result.ok) {
        return NextResponse.json(
            { error: { code: "unauthorized", message: result.error } },
            { status: result.status }
        );
    }
    return { session: result.session };
}

// ───────────────────────── HELPERS ───────────────────────

export function getRequestIp(req: NextRequest): string {
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown"
    );
}

export function getRequestUserAgent(req: NextRequest): string | null {
    return req.headers.get("user-agent") || null;
}

export function jsonError(
    code: string,
    message: string,
    status: number,
    extra?: Record<string, unknown>
): NextResponse {
    return NextResponse.json(
        { error: { code, message, ...(extra ?? {}) } },
        { status }
    );
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
    return NextResponse.json({ data }, { status });
}
