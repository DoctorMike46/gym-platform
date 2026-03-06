import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { redirect } from "next/navigation";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-secret-change-in-production-32ch"
);

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

        if (!id || !email) {
            throw new Error("Token non valido");
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
