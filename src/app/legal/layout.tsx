import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LegalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // L'app mobile imposta un UA custom quando apre queste pagine in WebView
    // interna: nascondiamo header/footer perché la navigazione è gestita
    // dall'AppBar nativa con la freccia indietro.
    const ua = (await headers()).get("user-agent") ?? "";
    const isEmbedded = ua.includes("GymPlatformMobile");

    let siteName = "Ernesto Performance";
    let primaryColor = "#003366";
    try {
        const [row] = await db.select().from(settings).limit(1);
        if (row) {
            siteName = row.site_name ?? siteName;
            primaryColor = row.primary_color ?? primaryColor;
        }
    } catch {
        // ignore
    }

    if (isEmbedded) {
        return (
            <div className="min-h-screen bg-slate-50">
                <main className="max-w-3xl mx-auto px-6 py-8">{children}</main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header
                className="border-b border-slate-200 bg-white"
                style={{ borderTopWidth: 4, borderTopColor: primaryColor, borderTopStyle: "solid" }}
            >
                <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
                    <Link
                        href="/portal"
                        className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-2"
                    >
                        <ArrowLeft size={16} />
                        Torna alla home
                    </Link>
                    <span className="text-sm font-semibold text-slate-700">
                        {siteName}
                    </span>
                </div>
            </header>
            <main className="max-w-3xl mx-auto px-6 py-10">{children}</main>
            <footer className="max-w-3xl mx-auto px-6 py-10 text-xs text-slate-500 flex flex-wrap gap-4 border-t border-slate-200 mt-10">
                <Link href="/legal/privacy" className="hover:underline">
                    Privacy Policy
                </Link>
                <Link href="/legal/terms" className="hover:underline">
                    Termini di Servizio
                </Link>
                <Link href="/portal" className="hover:underline ml-auto">
                    Torna alla home
                </Link>
            </footer>
        </div>
    );
}
