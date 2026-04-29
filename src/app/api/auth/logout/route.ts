import { NextRequest, NextResponse } from "next/server";

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
    response.cookies.set("trainer_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(0),
        maxAge: 0,
    });
    return response;
}
