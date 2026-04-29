import { getPublicBranding } from "@/lib/actions/settings";
import { validateClientResetToken } from "@/lib/actions/portal-auth";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import ResetForm from "./reset-form";

export default async function PortalResetPasswordPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const settings = await getPublicBranding();
    const { token } = await params;

    const result = await validateClientResetToken(token);
    const isValid = result.valid;
    const reason = result.valid ? null : result.reason;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${settings?.sidebar_color || "#003366"}15 0%, #f8fafc 50%, ${settings?.primary_color || "#003366"}08 100%)` }}>
            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${settings?.sidebar_color || "#003366"}, ${settings?.primary_color || "#1e40af"})` }} />
                    <div className="p-8 sm:p-10">
                        <div className="mb-8 text-center">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nuova Password</h1>
                            <p className="text-slate-500 text-sm mt-2">Imposta una nuova password sicura per il tuo account</p>
                        </div>

                        {!isValid ? (
                            <div className="text-center py-6">
                                <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6">
                                    <AlertCircle size={32} className="text-rose-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{reason === "expired" ? "Link Scaduto" : "Link non Valido"}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                                    {reason === "expired" ? "Il link di ripristino è scaduto. Richiedine uno nuovo." : "Il link di ripristino non è valido."}
                                </p>
                                <Link href="/portal/forgot-password" className="inline-flex h-12 items-center justify-center px-6 rounded-xl text-white font-semibold text-sm" style={{ background: settings?.primary_color || "#003366" }}>
                                    Richiedi nuovo link
                                </Link>
                            </div>
                        ) : (
                            <ResetForm token={token} primaryColor={settings?.primary_color || "#003366"} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
