import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";

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

export const CLIENT_COOKIE = "client_session";

export interface ClientSession {
    id: number;
    trainer_id: number;
    email: string;
}

export async function createClientSessionToken(client: {
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
        .setAudience("client")
        .setExpirationTime("30d")
        .sign(JWT_SECRET);
}

export async function getAuthenticatedClient(): Promise<ClientSession> {
    const cookieStore = await cookies();
    const token = cookieStore.get(CLIENT_COOKIE)?.value;
    if (!token) throw new Error("Non autenticato");

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        if (payload.aud !== "client") throw new Error("Token non valido");

        const id = Number(payload.sub);
        const trainer_id = Number(payload.trainer_id);
        const email = payload.email as string;
        const iat = payload.iat as number | undefined;

        if (!id || !email || !trainer_id) throw new Error("Token non valido");

        if (iat) {
            const [client] = await db
                .select({
                    password_changed_at: clients.password_changed_at,
                    is_active: clients.is_active,
                })
                .from(clients)
                .where(eq(clients.id, id))
                .limit(1);

            if (!client || !client.is_active) throw new Error("Account disattivato");
            if (client.password_changed_at && iat * 1000 < client.password_changed_at.getTime()) {
                throw new Error("Sessione invalidata");
            }
        }

        return { id, trainer_id, email };
    } catch {
        throw new Error("Sessione scaduta o non valida");
    }
}

export async function getAuthenticatedClientSafe(): Promise<ClientSession | null> {
    try {
        return await getAuthenticatedClient();
    } catch {
        return null;
    }
}

export async function requireClientAuth(): Promise<ClientSession> {
    try {
        return await getAuthenticatedClient();
    } catch {
        redirect("/portal/login");
    }
}
