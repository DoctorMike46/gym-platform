import Link from "next/link";
import { Smartphone, Download, ArrowRight } from "lucide-react";
import { db } from "@/db";
import { settings } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * Landing pubblica "Scarica l'app".
 * Il portale web cliente è stato decommissionato: tutto il flusso cliente
 * passa ora dall'app mobile. Il middleware redirige ogni /portal/* qui.
 */
export default async function PortalLandingPage() {
    let siteName = "Ernesto Performance";
    let logoUrl: string | null = null;
    let primaryColor = "#003366";
    try {
        const [row] = await db.select().from(settings).limit(1);
        if (row) {
            siteName = row.site_name ?? siteName;
            logoUrl = row.logo_url ?? null;
            primaryColor = row.primary_color ?? primaryColor;
        }
    } catch {
        // ignore, usiamo defaults
    }

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6"
            style={{
                background: `linear-gradient(135deg, ${primaryColor}, #1e3a8a)`,
            }}
        >
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-10 text-center">
                {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={logoUrl}
                        alt={siteName}
                        className="h-16 mx-auto mb-6 object-contain"
                    />
                ) : (
                    <div
                        className="h-16 w-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Smartphone size={32} className="text-white" />
                    </div>
                )}

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                    {siteName}
                </h1>

                <p className="text-slate-500 text-sm mb-8">
                    Scarica l&apos;app per accedere alla tua area personale.
                </p>

                <div className="space-y-3">
                    <a
                        href="#"
                        className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-white font-semibold"
                    >
                        <Download size={18} />
                        Scarica per iPhone
                    </a>
                    <a
                        href="#"
                        className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-white font-semibold"
                    >
                        <Download size={18} />
                        Scarica per Android
                    </a>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 text-sm">
                    <p className="text-slate-500 mb-2">Sei un trainer?</p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 font-semibold hover:underline"
                        style={{ color: primaryColor }}
                    >
                        Accedi al pannello trainer
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </div>

            <p className="mt-6 text-xs text-white/70 text-center max-w-md">
                Hai bisogno di aiuto? Contatta il tuo trainer per ricevere il
                link diretto al download.
            </p>
        </div>
    );
}
