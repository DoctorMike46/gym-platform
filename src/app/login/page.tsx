import { getPublicBranding } from "@/lib/actions/settings";
import LoginForm from "./login-form";

export default async function LoginPage() {
    const settings = await getPublicBranding();

    return (
        <div
            className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
            style={{
                background: `linear-gradient(135deg, ${settings?.sidebar_color || "#003366"}15 0%, #f8fafc 50%, ${settings?.primary_color || "#003366"}08 100%)`,
            }}
        >
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
                    style={{ background: settings?.primary_color || "#003366" }}
                />
                <div
                    className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
                    style={{ background: settings?.sidebar_color || "#003366" }}
                />
            </div>

            <div className="relative w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    {/* Top bar */}
                    <div
                        className="h-1.5 w-full"
                        style={{
                            background: `linear-gradient(90deg, ${settings?.sidebar_color || "#003366"}, ${settings?.primary_color || "#1e40af"})`,
                        }}
                    />

                    <div className="p-10">
                        {/* Logo / Brand */}
                        <div className="flex flex-col items-center mb-10">
                            {settings?.logo_url ? (
                                <img
                                    src={settings.logo_url}
                                    alt={settings.site_name || "Logo"}
                                    className="h-16 object-contain mb-4"
                                />
                            ) : (
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                                    style={{
                                        background: `linear-gradient(135deg, ${settings?.sidebar_color || "#003366"}, ${settings?.primary_color || "#1e40af"})`,
                                    }}
                                >
                                    <span className="text-2xl font-black text-white">
                                        {(settings?.site_name || "E").charAt(0)}
                                    </span>
                                </div>
                            )}
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center">
                                {settings?.site_name || "Ernesto Performance"}
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">Accedi al tuo pannello trainer</p>
                        </div>

                        <LoginForm primaryColor={settings?.primary_color || "#003366"} />
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400 mt-6">
                    Piattaforma riservata ai trainer autorizzati
                </p>
            </div>
        </div>
    );
}
