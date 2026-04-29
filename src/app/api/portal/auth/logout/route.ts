import { NextRequest, NextResponse } from "next/server";
import { CLIENT_COOKIE } from "@/lib/client-auth";

export async function POST(request: NextRequest) {
    // CSRF: confronta l'origin del browser con l'host della request stessa.
    // Auto-deriva, funziona su qualsiasi dominio (preview Vercel, custom, www) senza
    // dipendere da NEXT_PUBLIC_APP_URL (che spesso non matcha tutti gli alias).
    const origin = request.headers.get("origin");
    if (origin) {
        try {
            const requestHost = new URL(request.url).host;
            const originHost = new URL(origin).host;
            if (originHost !== requestHost) {
                return NextResponse.json({ error: "Origine non consentita" }, { status: 403 });
            }
        } catch {
            return NextResponse.json({ error: "Origine non valida" }, { status: 403 });
        }
    }

    const response = NextResponse.json({ success: true });
    // Sovrascrivi con stessi attributi del set originale, expires nel passato.
    // Senza far combaciare path/sameSite/secure alcuni browser non rimuovono il cookie.
    response.cookies.set(CLIENT_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(0),
        maxAge: 0,
    });
    return response;
}
