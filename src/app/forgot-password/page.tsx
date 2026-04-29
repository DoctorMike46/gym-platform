import { getSettings } from "@/lib/actions/settings";
import ForgotPasswordForm from "./forgot-password-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ForgotPasswordPage() {
    const settings = await getSettings();

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
                        <div className="mb-8">
                            <Link
                                href="/login"
                                className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors mb-6 group"
                            >
                                <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                                Torna al login
                            </Link>

                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                Recupero Password
                            </h1>
                            <p className="text-slate-500 text-sm mt-2">
                                Inserisci la tua email per ricevere un link di ripristino
                            </p>
                        </div>

                        <ForgotPasswordForm primaryColor={settings?.primary_color || "#003366"} />
                    </div>
                </div>
            </div>
        </div>
    );
}
