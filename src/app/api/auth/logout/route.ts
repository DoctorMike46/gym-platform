import { NextResponse } from "next/server";

export async function GET() {
    const response = NextResponse.json({ success: true });
    response.cookies.set("trainer_session", "", {
        httpOnly: true,
        maxAge: 0,
        path: "/",
    });
    return response;
}

export async function POST() {
    const response = NextResponse.json({ success: true });
    response.cookies.set("trainer_session", "", {
        httpOnly: true,
        maxAge: 0,
        path: "/",
    });
    return response;
}
