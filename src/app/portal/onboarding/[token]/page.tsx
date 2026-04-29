import { getPublicBranding } from "@/lib/actions/settings";
import { validateInviteToken } from "@/lib/actions/portal-auth";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const settings = await getPublicBranding();
    const { token } = await params;
    const validation = await validateInviteToken(token);

    if (!validation.valid) {
        const reason = validation.reason;
        const messages = {
            expired: "Il link di invito è scaduto. Contatta il tuo trainer per riceverne uno nuovo.",
            not_found: "Link di invito non valido.",
            already_active: "Questo account è già stato attivato. Vai al login.",
        };
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10 text-center border">
                    <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} className="text-rose-600" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">
                        {reason === "already_active" ? "Account già attivo" : "Link non valido"}
                    </h1>
                    <p className="text-slate-500 text-sm mb-8">{messages[reason]}</p>
                    <Link href="/portal/login" className="inline-flex h-12 items-center justify-center px-6 rounded-xl text-white font-semibold text-sm" style={{ background: settings?.primary_color || "#003366" }}>
                        Vai al Login
                    </Link>
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
