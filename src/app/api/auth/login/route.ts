import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
    try {
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

        const response = NextResponse.json({ success: true });
        response.cookies.set("trainer_session", "authenticated", {
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
