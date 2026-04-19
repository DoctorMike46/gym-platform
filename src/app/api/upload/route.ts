import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { uploadToR2 } from "@/lib/r2";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "Nessun file ricevuto" }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Tipo di file non supportato. Usa PNG, JPG, SVG o WebP." }, { status: 400 });
        }

        // Validate file size (2MB max)
        const MAX_SIZE = 2 * 1024 * 1024; // 2MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: "File troppo grande. Dimensione massima: 2MB" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const ext = path.extname(file.name).toLowerCase() || ".png";
        const sanitizedExt = ext.replace(/[^a-zA-Z0-9.]/g, "");
        const key = `public/logos/logo_${Date.now()}${sanitizedExt}`;

        await uploadToR2({
            key,
            body: buffer,
            contentType: file.type,
        });

        const publicUrl = `/api/media/${key}`;
        return NextResponse.json({ url: publicUrl, success: true });
    } catch (error) {
        console.error("Errore upload:", error);
        return NextResponse.json({ error: "Errore durante l'upload" }, { status: 500 });
    }
}
