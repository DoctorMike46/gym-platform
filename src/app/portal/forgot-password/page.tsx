import { getPublicBranding } from "@/lib/actions/settings";
import ForgotForm from "./forgot-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function PortalForgotPasswordPage() {
    const settings = await getPublicBranding();

    return (
        <div
            className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
            style={{
                background: `linear-gradient(135deg, ${settings?.sidebar_color || "#003366"}15 0%, #f8fafc 50%, ${settings?.primary_color || "#003366"}08 100%)`,
            }}
        >
            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${settings?.sidebar_color || "#003366"}, ${settings?.primary_color || "#1e40af"})` }} />
                    <div className="p-8 sm:p-10">
                        <Link href="/portal/login" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors mb-6">
                            <ArrowLeft size={14} className="mr-1" /> Torna al login
                        </Link>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Recupero Password</h1>
                        <p className="text-slate-500 text-sm mt-2 mb-8">Inserisci la tua email per ricevere un link di ripristino</p>
                        <ForgotForm primaryColor={settings?.primary_color || "#003366"} />
                    </div>
                </div>
            </div>
        </div>
    );
}
