import { getSettings } from "@/lib/actions/settings";
import ResetPasswordForm from "./reset-password-form";
import { validateResetToken } from "@/lib/actions/auth-reset";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const settings = await getSettings();
    const { token } = await searchParams;

    let isValid = false;
    let invalidReason: "expired" | "not_found" = "not_found";
    if (token) {
        const result = await validateResetToken(token);
        isValid = result.valid;
        if (!result.valid) invalidReason = result.reason;
    }

    return (
        <div
            className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden relative"
            style={{
                background: `linear-gradient(135deg, ${settings?.sidebar_color || "#003366"}15 0%, #f8fafc 50%, ${settings?.primary_color || "#003366"}08 100%)`,
            }}
        >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -top-40 -right-40 w-72 h-72 sm:w-96 sm:h-96 rounded-full opacity-10 blur-3xl"
                    style={{ background: settings?.primary_color || "#003366" }}
                />
                <div
                    className="absolute -bottom-40 -left-40 w-72 h-72 sm:w-96 sm:h-96 rounded-full opacity-10 blur-3xl"
                    style={{ background: settings?.sidebar_color || "#003366" }}
                />
            </div>

            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    <div
                        className="h-1.5 w-full"
                        style={{
                            background: `linear-gradient(90deg, ${settings?.sidebar_color || "#003366"}, ${settings?.primary_color || "#1e40af"})`,
                        }}
                    />

                    <div className="p-6 sm:p-10">
                        <div className="mb-8 text-center">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                Nuova Password
                            </h1>
                            <p className="text-slate-500 text-sm mt-2">
                                Imposta una nuova password sicura per il tuo account
                            </p>
                        </div>

                        {!isValid ? (
                            <div className="text-center py-6 animate-in fade-in zoom-in duration-500">
                                <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6">
                                    <AlertCircle size={32} className="text-rose-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">
                                    {invalidReason === "expired" ? "Link Scaduto" : "Link non Valido"}
                                </h3>
                                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                                    {invalidReason === "expired"
                                        ? "Il link di ripristino è scaduto. Richiedine uno nuovo per continuare."
                                        : "Il link di ripristino non è valido. Richiedine uno nuovo per continuare."}
                                </p>
                                <Link
                                    href="/forgot-password"
                                    className="inline-flex h-12 items-center justify-center px-6 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                                    style={{ background: settings?.primary_color || "#003366" }}
                                >
                                    Torna a Richiedi Link
                                </Link>
                            </div>
                        ) : (
                            <ResetPasswordForm
                                token={token!}
                                primaryColor={settings?.primary_color || "#003366"}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
