import { NextRequest, NextResponse } from "next/server";
import { CLIENT_COOKIE } from "@/lib/client-auth";

export async function POST(request: NextRequest) {
    const origin = request.headers.get("origin");
    const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL;
    if (expectedOrigin && origin && origin !== expectedOrigin) {
        return NextResponse.json({ error: "Origine non consentita" }, { status: 403 });
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
