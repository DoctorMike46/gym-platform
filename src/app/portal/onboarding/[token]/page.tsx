import { getPublicBranding } from "@/lib/actions/settings";
import { validateInviteToken } from "@/lib/actions/portal-auth";
import { CheckCircle2, Download, Smartphone } from "lucide-react";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const settings = await getPublicBranding();
    const { token } = await params;
    const validation = await validateInviteToken(token);
    const primaryColor = settings?.primary_color || "#003366";
    const sidebarColor = settings?.sidebar_color || "#003366";
    const siteName = settings?.site_name || "Ernesto Performance";

    if (!validation.valid) {
        // Tutti i casi non validi (expired / not_found / already_active) puntano
        // alla stessa CTA: scaricare l'app. Niente messaggi "link non valido".
        const subtitle =
            validation.reason === "expired"
                ? "Il link di invito è scaduto, ma puoi sempre accedere dall'app con le tue credenziali."
                : "Il tuo account è pronto. Scarica l'app per accedere alla tua area personale.";
        return (
            <div
                className="min-h-screen flex items-center justify-center p-4"
                style={{
                    background: `linear-gradient(135deg, ${sidebarColor}15 0%, #f8fafc 50%, ${primaryColor}08 100%)`,
                }}
            >
                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    <div
                        className="h-1.5 w-full"
                        style={{
                            background: `linear-gradient(90deg, ${sidebarColor}, ${primaryColor})`,
                        }}
                    />
                    <div className="p-8 sm:p-10 text-center space-y-6">
                        <div
                            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                            style={{ background: `${primaryColor}15` }}
                        >
                            <CheckCircle2 size={32} style={{ color: primaryColor }} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                Benvenuto su {siteName}!
                            </h1>
                            <p className="text-slate-500 text-sm mt-2">{subtitle}</p>
                        </div>
                        <div className="space-y-2">
                            <a
                                href="#"
                                className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-white font-semibold text-sm"
                            >
                                <Download size={16} />
                                Scarica per iPhone
                            </a>
                            <a
                                href="#"
                                className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-white font-semibold text-sm"
                            >
                                <Smartphone size={16} />
                                Scarica per Android
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${settings?.sidebar_color || "#003366"}15 0%, #f8fafc 50%, ${settings?.primary_color || "#003366"}08 100%)` }}>
            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${settings?.sidebar_color || "#003366"}, ${settings?.primary_color || "#1e40af"})` }} />
                    <div className="p-8 sm:p-10">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Benvenuto, {validation.nome}!</h1>
                        <p className="text-slate-500 text-sm mt-2 mb-8">Imposta la tua password per attivare l&apos;account su {settings?.site_name || "Ernesto Performance"}.</p>
                        <OnboardingForm token={token} email={validation.email} primaryColor={settings?.primary_color || "#003366"} />
                    </div>
                </div>
            </div>
        </div>
    );
}
