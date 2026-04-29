import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createClientSessionToken, CLIENT_COOKIE } from "@/lib/client-auth";
import { loginLimiter, retryAfterSeconds } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || request.headers.get("x-real-ip")
            || "unknown";

        const rl = await loginLimiter.limit(`portal:ip:${ip}`);
        if (!rl.success) {
            const retry = retryAfterSeconds(rl.reset);
            return NextResponse.json(
                { error: `Troppi tentativi. Riprova tra ${retry} secondi.` },
                { status: 429, headers: { "Retry-After": String(retry) } }
            );
        }

        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email o password non corretti." }, { status: 401 });
        }

        const [client] = await db.select().from(clients).where(eq(clients.email, email)).limit(1);

        if (!client || !client.password_hash || !client.is_active) {
            return NextResponse.json({ error: "Email o password non corretti." }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, client.password_hash);
        if (!isValid) {
            return NextResponse.json({ error: "Email o password non corretti." }, { status: 401 });
        }

        await db.update(clients).set({ last_login_at: new Date() }).where(eq(clients.id, client.id));

        const token = await createClientSessionToken({
            id: client.id,
            trainer_id: client.trainer_id,
            email: client.email,
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set(CLIENT_COOKIE, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
        });
        return response;
    } catch (e) {
        console.error("Errore portal login:", e);
        return NextResponse.json({ error: "Errore del server." }, { status: 500 });
    }
}
