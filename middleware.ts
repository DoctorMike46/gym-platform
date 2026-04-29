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

const CLIENT_PUBLIC_PATHS = [
    "/portal/login",
    "/portal/forgot-password",
    "/portal/reset-password",
    "/portal/onboarding",
    "/api/portal/auth/login",
    "/api/portal/auth/logout",
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

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

    // Client portal namespace
    if (pathname.startsWith("/portal") || pathname.startsWith("/api/portal")) {
        if (CLIENT_PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
            return NextResponse.next();
        }
        const token = request.cookies.get("client_session")?.value;
        if (!token) {
            return NextResponse.redirect(new URL("/portal/login", request.url));
        }
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            if (payload.aud !== "client") throw new Error("wrong audience");
            return NextResponse.next();
        } catch {
            const response = NextResponse.redirect(new URL("/portal/login", request.url));
            response.cookies.set("client_session", "", { httpOnly: true, maxAge: 0, path: "/" });
            return response;
        }
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
