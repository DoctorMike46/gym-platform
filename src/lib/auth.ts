import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { trainers } from "@/db/schema";
import { eq } from "drizzle-orm";

function getJwtSecret(): Uint8Array {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 32) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("JWT_SECRET must be set and >=32 chars in production");
        }
        console.warn("Using fallback dev JWT secret — DO NOT deploy this way");
        return new TextEncoder().encode("dev-secret-change-in-production-32ch");
    }
    return new TextEncoder().encode(s);
}

const JWT_SECRET = getJwtSecret();

export interface TrainerSession {
    id: number;
    email: string;
    role: string;
}

/**
 * Crea un JWT per il trainer autenticato
 */
export async function createSessionToken(trainer: { id: number; email: string; role: string }): Promise<string> {
    return new SignJWT({ sub: String(trainer.id), email: trainer.email, role: trainer.role })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(JWT_SECRET);
}

/**
 * Verifica il JWT dal cookie e restituisce i dati del trainer.
 * Da usare nelle server actions per garantire autenticazione e multi-tenancy.
 * Lancia errore se non autenticato.
 */
export async function getAuthenticatedTrainer(): Promise<TrainerSession> {
    const cookieStore = await cookies();
    const token = cookieStore.get("trainer_session")?.value;

    if (!token) {
        throw new Error("Non autenticato");
    }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const id = Number(payload.sub);
        const email = payload.email as string;
        const role = payload.role as string || "trainer";
        const iat = payload.iat as number | undefined;

        if (!id || !email) {
            throw new Error("Token non valido");
        }

        if (iat) {
            const [trainer] = await db
                .select({ password_changed_at: trainers.password_changed_at })
                .from(trainers)
                .where(eq(trainers.id, id))
                .limit(1);
            if (trainer?.password_changed_at && iat * 1000 < trainer.password_changed_at.getTime()) {
                throw new Error("Sessione invalidata");
            }
        }

        return { id, email, role };
    } catch {
        throw new Error("Sessione scaduta o non valida");
    }
}

/**
 * Come getAuthenticatedTrainer ma restituisce null invece di lanciare errore.
 * Da usare quando il contesto potrebbe non essere autenticato (es. layout, login page).
 */
export async function getAuthenticatedTrainerSafe(): Promise<TrainerSession | null> {
    try {
        return await getAuthenticatedTrainer();
    } catch {
        return null;
    }
}

/**
 * Verifica che l'utente sia autenticato, altrimenti reindirizza al login.
 * Da usare nelle server pages (page.tsx).
 */
export async function requireAuth(): Promise<TrainerSession> {
    try {
        return await getAuthenticatedTrainer();
    } catch {
        redirect("/login");
    }
}

/**
 * Verifica che l'utente sia admin, altrimenti reindirizza o lancia errore.
 */
export async function requireAdmin(): Promise<TrainerSession> {
    const session = await requireAuth();
    if (session.role !== "admin") {
        redirect("/"); // O una pagina di errore 403
    }
    return session;
}

/**
 * Verifica un JWT token (per uso nel middleware edge runtime).
 * NON usa cookies(), riceve il token come parametro.
 */
export async function verifyToken(token: string): Promise<TrainerSession | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const id = Number(payload.sub);
        const email = payload.email as string;
        const role = payload.role as string || "trainer";

        if (!id || !email) return null;
        return { id, email, role };
    } catch {
        return null;
    }
}
