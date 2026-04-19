import { NextRequest, NextResponse } from "next/server";
import { downloadFromR2 } from "@/lib/r2";

// Serve file pubblici da R2 (solo prefisso "public/" per motivi di sicurezza)
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ key: string[] }> }
) {
    const { key: keyParts } = await params;
    const key = keyParts.join("/");

    if (!key.startsWith("public/")) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
        const buffer = await downloadFromR2(key);
        const ext = key.split(".").pop()?.toLowerCase() || "";
        const contentType =
            ext === "png" ? "image/png" :
            ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
            ext === "gif" ? "image/gif" :
            ext === "webp" ? "image/webp" :
            ext === "svg" ? "image/svg+xml" :
            "application/octet-stream";

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
        });
    } catch (error) {
        console.error("Errore media R2:", error);
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
}
