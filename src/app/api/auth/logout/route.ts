import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const origin = request.headers.get("origin");
    const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL;
    if (expectedOrigin && origin && origin !== expectedOrigin) {
        return NextResponse.json({ error: "Origine non consentita" }, { status: 403 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("trainer_session", "", {
        httpOnly: true,
        maxAge: 0,
        path: "/",
    });
    return response;
}
