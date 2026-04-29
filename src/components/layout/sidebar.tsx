"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Users,
    LayoutDashboard,
    Dumbbell,
    ClipboardList,
    Wallet,
    FileText,
    Megaphone,
    ChevronLeft,
    ChevronRight,
    Settings,
    LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarSettings {
    site_name?: string | null;
    logo_url?: string | null;
    sidebar_logo_url?: string | null;
    sidebar_color?: string | null;
}

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    settings: SidebarSettings | null;
}

export function Sidebar({ isCollapsed, setIsCollapsed, settings }: SidebarProps) {
    const sidebarColor = settings?.sidebar_color || "#003366";

    return (
        <aside
            className={cn(
                "hidden md:flex sticky top-4 my-4 ml-4 h-[calc(100vh-2rem)] shadow-2xl transition-all duration-500 z-40 flex-col",
                "backdrop-blur-xl border border-white/10",
                isCollapsed ? "w-20 rounded-2xl" : "w-64 rounded-[2.5rem]"
            )}
            style={{
                background: `linear-gradient(135deg, ${sidebarColor}e6, #1e3a8acc)`,
            }}
        >
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-12 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-all duration-300 z-[60] border border-blue-100"
                style={{ color: "var(--brand-primary, #003366)" }}
                aria-label={isCollapsed ? "Espandi sidebar" : "Comprimi sidebar"}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <SidebarContent isCollapsed={isCollapsed} settings={settings} />
        </aside>
    );
}

export function SidebarContent({
    isCollapsed,
    settings,
    onNavigate,
}: {
    isCollapsed: boolean;
    settings: SidebarSettings | null;
    onNavigate?: () => void;
}) {
    const siteName = settings?.site_name || "Ernesto Performance";
    const logoUrl = settings?.logo_url || "";
    const sidebarLogoUrl = settings?.sidebar_logo_url || "";
    const pathname = usePathname();
    const router = useRouter();

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        onNavigate?.();
        router.push("/login");
        router.refresh();
    }

    return (
        <>
            <div
                className={cn(
                    "flex items-center shrink-0",
                    isCollapsed ? "justify-center p-4 h-24" : "justify-center px-4 py-4 h-36"
                )}
            >
                {isCollapsed ? (
                    sidebarLogoUrl ? (
                        <img src={sidebarLogoUrl} alt={siteName} className="w-14 h-14 object-contain" />
                    ) : logoUrl ? (
                        <img src={logoUrl} alt={siteName} className="w-14 h-14 object-contain" />
                    ) : (
                        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                            <span className="text-2xl font-black text-white">
                                {siteName.substring(0, 1) || "E"}
                            </span>
                        </div>
                    )
                ) : sidebarLogoUrl ? (
                    <img src={sidebarLogoUrl} alt={siteName} className="h-24 max-w-[220px] object-contain" />
                ) : logoUrl ? (
                    <img src={logoUrl} alt={siteName} className="h-24 max-w-[220px] object-contain" />
                ) : (
                    <h2 className="text-xl font-black tracking-tight whitespace-pre-wrap leading-tight text-white drop-shadow-sm text-center">
                        {siteName}
                    </h2>
                )}
            </div>

            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar py-2">
                <SidebarItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" isCollapsed={isCollapsed} pathname={pathname} onNavigate={onNavigate} />
                <SidebarItem href="/clients" icon={<Users size={20} />} label="Clienti" isCollapsed={isCollapsed} pathname={pathname} onNavigate={onNavigate} />
                <SidebarItem href="/workouts" icon={<ClipboardList size={20} />} label="Schede" isCollapsed={isCollapsed} pathname={pathname} onNavigate={onNavigate} />
                <SidebarItem href="/exercises" icon={<Dumbbell size={20} />} label="Esercizi" isCollapsed={isCollapsed} pathname={pathname} onNavigate={onNavigate} />
                <SidebarItem href="/services" icon={<Wallet size={20} />} label="Servizi" isCollapsed={isCollapsed} pathname={pathname} onNavigate={onNavigate} />
                <SidebarItem href="/announcements" icon={<Megaphone size={20} />} label="Annunci" isCollapsed={isCollapsed} pathname={pathname} onNavigate={onNavigate} />
                <SidebarItem href="/documents" icon={<FileText size={20} />} label="Documenti" isCollapsed={isCollapsed} pathname={pathname} onNavigate={onNavigate} />
            </nav>

            <div className="p-4 space-y-1.5">
                <div className="border-t border-white/10 pt-3 space-y-1.5">
                    <SidebarItem href="/settings" icon={<Settings size={20} />} label="Impostazioni" isCollapsed={isCollapsed} pathname={pathname} onNavigate={onNavigate} />
                    <button
                        onClick={handleLogout}
                        className={cn(
                            "group w-full flex items-center rounded-xl transition-all duration-200 relative min-h-[44px]",
                            "hover:bg-white/10 active:scale-[0.98]",
                            isCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3"
                        )}
                        title={isCollapsed ? "Esci" : undefined}
                    >
                        <div className="text-white/70 group-hover:text-white transition-colors">
                            <LogOut size={20} />
                        </div>
                        {!isCollapsed && <span className="text-sm font-medium text-white/80 group-hover:text-white">Esci</span>}
                    </button>
                </div>
            </div>
        </>
    );
}

function SidebarItem({
    href,
    icon,
    label,
    isCollapsed,
    pathname,
    onNavigate,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    isCollapsed: boolean;
    pathname: string;
    onNavigate?: () => void;
}) {
    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

    return (
        <Link
            href={href}
            onClick={onNavigate}
            className={cn(
                "group flex items-center rounded-xl transition-all duration-200 relative min-h-[44px]",
                isActive ? "bg-white/15" : "hover:bg-white/10",
                "active:scale-[0.98]",
                isCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3"
            )}
            title={isCollapsed ? label : undefined}
        >
            <div className={cn("transition-colors", isActive ? "text-white" : "text-white/70 group-hover:text-white")}>
                {icon}
            </div>
            {!isCollapsed && (
                <span
                    className={cn(
                        "text-sm font-medium transition-colors",
                        isActive ? "text-white" : "text-white/80 group-hover:text-white"
                    )}
                >
                    {label}
                </span>
            )}
            <div
                className={cn(
                    "absolute left-0 w-1 rounded-full transition-all duration-300 bg-white",
                    isActive ? "h-6" : "h-0 group-hover:h-4"
                )}
            />
        </Link>
    );
}
