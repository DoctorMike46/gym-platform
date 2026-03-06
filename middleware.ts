import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths and static files
    const isPublic =
        PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/uploads") ||
        pathname.startsWith("/favicon");

    if (isPublic) return NextResponse.next();

    const session = request.cookies.get("trainer_session");

    if (!session || session.value !== "authenticated") {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
