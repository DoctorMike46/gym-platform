import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSessionToken } from "@/lib/auth";
import { loginLimiter, retryAfterSeconds } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || request.headers.get("x-real-ip")
            || "unknown";

        const rl = await loginLimiter.limit(`ip:${ip}`);
        if (!rl.success) {
            const retry = retryAfterSeconds(rl.reset);
            return NextResponse.json(
                { error: `Troppi tentativi. Riprova tra ${retry} secondi.` },
                { status: 429, headers: { "Retry-After": String(retry) } }
            );
        }

        const { email, password } = await request.json();

        const result = await db.select().from(trainers).where(eq(trainers.email, email)).limit(1);
        const trainer = result[0];

        if (!trainer) {
            return NextResponse.json({ error: "Email o password non corretti." }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, trainer.password_hash);
        if (!isValid) {
            return NextResponse.json({ error: "Email o password non corretti." }, { status: 401 });
        }

        // Genera JWT con identità del trainer
        const token = await createSessionToken({
            id: trainer.id,
            email: trainer.email,
            role: trainer.role || "trainer"
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set("trainer_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });
        return response;
    } catch {
        return NextResponse.json({ error: "Errore del server." }, { status: 500 });
    }
}
