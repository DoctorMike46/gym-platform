import { NextRequest, NextResponse } from "next/server";
import { CLIENT_COOKIE } from "@/lib/client-auth";

export async function POST(request: NextRequest) {
    const origin = request.headers.get("origin");
    const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL;
    if (expectedOrigin && origin && origin !== expectedOrigin) {
        return NextResponse.json({ error: "Origine non consentita" }, { status: 403 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(CLIENT_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
    return response;
}
