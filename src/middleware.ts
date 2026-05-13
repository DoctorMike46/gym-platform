import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

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

const TRAINER_PUBLIC_PATHS = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/media/public",
];


export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Mobile REST API: gestisce auth/errori in JSON puro per-route
    if (pathname.startsWith("/api/v1")) {
        return NextResponse.next();
    }

    // Cron jobs: protetti via CRON_SECRET o header Vercel Cron lato handler
    if (pathname.startsWith("/api/cron")) {
        return NextResponse.next();
    }

    // Static / framework
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/uploads") ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/icons") ||
        pathname === "/manifest.webmanifest" ||
        pathname === "/sw.js" ||
        pathname === "/offline"
    ) {
        return NextResponse.next();
    }

    // Pagine legali pubbliche (richieste GDPR)
    if (pathname.startsWith("/legal")) {
        return NextResponse.next();
    }

    // Portale web cliente: DECOMMISSIONATO con eccezioni.
    // Le route mantenute pubbliche servono SOLO per il flusso di
    // attivazione account (link email dal trainer) e reset password.
    // Tutto il resto redirige alla landing "Scarica l'app".
    const PORTAL_PUBLIC_PREFIXES = [
        "/portal/onboarding/",
        "/portal/reset-password/",
        "/portal/forgot-password",
    ];
    if (pathname === "/portal") {
        return NextResponse.next();
    }
    if (PORTAL_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }
    if (pathname.startsWith("/portal/")) {
        return NextResponse.redirect(new URL("/portal", request.url));
    }
    if (pathname.startsWith("/api/portal")) {
        return NextResponse.next();
    }

    // Trainer namespace
    if (TRAINER_PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    const token = request.cookies.get("trainer_session")?.value;
    if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        if (payload.aud === "client") throw new Error("wrong audience");
        return NextResponse.next();
    } catch {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.set("trainer_session", "", { httpOnly: true, maxAge: 0, path: "/" });
        return response;
    }
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
