"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, TrendingUp, FileText, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalBrand {
    site_name: string;
    primary_color: string;
    sidebar_color: string;
    logo_url: string | null;
}

interface PortalShellProps {
    brand: PortalBrand;
    clientName: string;
    children: React.ReactNode;
}

const NAV_ITEMS = [
    { href: "/portal", label: "Home", icon: Home, exact: true },
    { href: "/portal/workouts", label: "Allenamenti", icon: Dumbbell, exact: false },
    { href: "/portal/progress", label: "Progressi", icon: TrendingUp, exact: false },
    { href: "/portal/documents", label: "Documenti", icon: FileText, exact: false },
    { href: "/portal/profile", label: "Profilo", icon: User, exact: false },
] as const;

export function PortalShell({ brand, clientName, children }: PortalShellProps) {
    const pathname = usePathname();

    async function logout() {
        try {
            await fetch("/api/portal/auth/logout", {
                method: "POST",
                credentials: "same-origin",
            });
        } catch {
            // anche se la chiamata fallisce, procediamo con il redirect (il middleware blocchera' l'accesso)
        }
        // Pulisci eventuali cache PWA legacy (versioni precedenti del SW cachevano html-pages)
        if (typeof window !== "undefined" && "caches" in window) {
            try {
                await caches.delete("html-pages");
            } catch {
                // ignore
            }
        }
        // Hard navigation: distrugge lo stato React (incluso questo shell) e forza il middleware
        window.location.replace("/portal/login");
    }

    function isActive(href: string, exact: boolean) {
        if (exact) return pathname === href;
        return pathname === href || pathname.startsWith(href + "/");
    }

    return (
        <div className="min-h-screen bg-slate-50 md:flex">
            {/* Desktop sidebar */}
            <aside
                className="hidden md:flex sticky top-4 my-4 ml-4 h-[calc(100vh-2rem)] w-64 shadow-2xl rounded-[2.5rem] flex-col backdrop-blur-xl border border-white/10 z-40"
                style={{
                    background: `linear-gradient(135deg, ${brand.sidebar_color}e6, #1e3a8acc)`,
                }}
            >
                <div className="flex items-center justify-center px-4 py-4 h-36 shrink-0">
                    {brand.logo_url ? (
                        <img
                            src={brand.logo_url}
                            alt={brand.site_name}
                            className="h-24 max-w-[220px] object-contain"
                        />
                    ) : (
                        <h2 className="text-xl font-black tracking-tight text-white text-center drop-shadow-sm whitespace-pre-wrap leading-tight">
                            {brand.site_name}
                        </h2>
                    )}
                </div>

                <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto py-2">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href, item.exact);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center rounded-xl transition-all duration-200 relative min-h-[44px] px-4 py-3 gap-3",
                                    active ? "bg-white/15" : "hover:bg-white/10",
                                    "active:scale-[0.98]"
                                )}
                            >
                                <div
                                    className={cn(
                                        "transition-colors",
                                        active ? "text-white" : "text-white/70 group-hover:text-white"
                                    )}
                                >
                                    <Icon size={20} />
                                </div>
                                <span
                                    className={cn(
                                        "text-sm font-medium transition-colors",
                                        active ? "text-white" : "text-white/80 group-hover:text-white"
                                    )}
                                >
                                    {item.label}
                                </span>
                                <div
                                    className={cn(
                                        "absolute left-0 w-1 rounded-full bg-white transition-all duration-300",
                                        active ? "h-6" : "h-0 group-hover:h-4"
                                    )}
                                />
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4">
                    <div className="border-t border-white/10 pt-3">
                        <div className="px-4 pb-2">
                            <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Account</p>
                            <p className="text-sm font-semibold text-white truncate">{clientName}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="group w-full flex items-center rounded-xl transition-all duration-200 min-h-[44px] px-4 py-3 gap-3 hover:bg-white/10 active:scale-[0.98]"
                        >
                            <LogOut size={20} className="text-white/70 group-hover:text-white transition-colors" />
                            <span className="text-sm font-medium text-white/80 group-hover:text-white">Esci</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile header */}
            <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 h-14 border-b border-slate-200 bg-white/95 backdrop-blur">
                <Link href="/portal" className="flex items-center gap-2 min-w-0">
                    {brand.logo_url ? (
                        <img
                            src={brand.logo_url}
                            alt={brand.site_name}
                            className="h-8 max-w-[140px] object-contain"
                        />
                    ) : (
                        <span className="font-bold text-slate-900 truncate">{brand.site_name}</span>
                    )}
                </Link>
                <button
                    onClick={logout}
                    aria-label="Esci"
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 transition"
                >
                    <LogOut size={18} className="text-slate-700" />
                </button>
            </header>

            {/* Main */}
            <main className="flex-1 min-w-0 p-4 pb-24 md:p-8 md:pb-8 max-w-4xl w-full mx-auto">
                {children}
            </main>

            {/* Mobile bottom-nav */}
            <nav
                className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                <div className="grid grid-cols-5 max-w-4xl mx-auto">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href, item.exact);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] active:scale-95 transition"
                                style={{ color: active ? brand.primary_color : undefined }}
                            >
                                <div className={active ? "" : "text-slate-500"}>
                                    <Icon size={20} />
                                </div>
                                <span className={cn("text-[10px] font-medium", !active && "text-slate-500")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
