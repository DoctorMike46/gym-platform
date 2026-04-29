import { getPublicBranding } from "@/lib/actions/settings";
import PortalLoginForm from "./login-form";
import Link from "next/link";

export const metadata = {
    title: "Accesso Cliente",
};

export default async function PortalLoginPage() {
    const settings = await getPublicBranding();

    return (
        <div
            className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden relative"
            style={{
                background: `linear-gradient(135deg, ${settings?.sidebar_color || "#003366"}15 0%, #f8fafc 50%, ${settings?.primary_color || "#003366"}08 100%)`,
            }}
        >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-72 h-72 sm:w-96 sm:h-96 rounded-full opacity-10 blur-3xl" style={{ background: settings?.primary_color || "#003366" }} />
                <div className="absolute -bottom-40 -left-40 w-72 h-72 sm:w-96 sm:h-96 rounded-full opacity-10 blur-3xl" style={{ background: settings?.sidebar_color || "#003366" }} />
            </div>

            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${settings?.sidebar_color || "#003366"}, ${settings?.primary_color || "#1e40af"})` }} />
                    <div className="p-8 sm:p-10">
                        <div className="flex flex-col items-center mb-8 min-h-[8rem]">
                            {settings?.logo_url ? (
                                <img src={settings.logo_url} alt={settings.site_name || "Logo"} className="h-24 sm:h-32 md:h-40 max-w-[280px] object-contain mb-6" loading="eager" />
                            ) : (
                                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-3xl flex items-center justify-center mb-6 shadow-lg" style={{ background: `linear-gradient(135deg, ${settings?.sidebar_color || "#003366"}, ${settings?.primary_color || "#1e40af"})` }}>
                                    <span className="text-4xl md:text-5xl font-black text-white">{(settings?.site_name || "E").charAt(0)}</span>
                                </div>
                            )}
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center">{settings?.site_name || "Ernesto Performance"}</h1>
                            <p className="text-slate-500 text-sm mt-1">Area Cliente</p>
                        </div>
                        <PortalLoginForm primaryColor={settings?.primary_color || "#003366"} />
                        <p className="text-center text-xs text-slate-400 mt-6">
                            Sei un trainer? <Link href="/login" className="font-semibold text-slate-600 hover:underline">Accesso Trainer</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
