"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, LayoutDashboard, Dumbbell, ClipboardList, Wallet, FileText, ChevronLeft, ChevronRight, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    settings: any;
}

export function Sidebar({ isCollapsed, setIsCollapsed, settings }: SidebarProps) {
    const siteName = settings?.site_name || "Ernesto Performance";
    const logoUrl = settings?.logo_url || "";
    const sidebarLogoUrl = settings?.sidebar_logo_url || "";
    const sidebarColor = settings?.sidebar_color || "#003366";
    const pathname = usePathname();
    const router = useRouter();


    async function handleLogout() {
        await fetch("/api/auth/logout");
        router.push("/login");
        router.refresh();
    }

    return (
        <aside
            className={cn(
                "fixed left-4 top-4 bottom-4 shadow-2xl transition-all duration-500 z-50 flex flex-col",
                "backdrop-blur-xl border border-white/10",
                isCollapsed ? "w-20 rounded-2xl" : "w-64 rounded-[2.5rem]"
            )}
            style={{
                background: `linear-gradient(135deg, ${sidebarColor}e6, #1e3a8acc)`,
            }}
        >
            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-12 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-all duration-300 z-[60] border border-blue-100"
                style={{ color: "var(--brand-primary, #003366)" }}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Logo / Brand */}
            <div className={cn("flex items-center p-6 h-28 shrink-0", isCollapsed ? "justify-center" : "justify-start")}>
                {isCollapsed ? (
                    sidebarLogoUrl ? (
                        <img src={sidebarLogoUrl} alt={siteName} className="w-10 h-10 object-contain" />
                    ) : logoUrl ? (
                        <img src={logoUrl} alt={siteName} className="w-10 h-10 object-contain" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                            <span className="text-xl font-black text-white">
                                {siteName.substring(0, 1) || "E"}
                            </span>
                        </div>
                    )
                ) : (
                    sidebarLogoUrl ? (
                        <img src={sidebarLogoUrl} alt={siteName} className="h-12 max-w-[180px] object-contain" />
                    ) : logoUrl ? (
                        <img src={logoUrl} alt={siteName} className="h-12 max-w-[180px] object-contain" />
                    ) : (
                        <h2 className="text-xl font-black tracking-tight whitespace-pre-wrap leading-tight text-white drop-shadow-sm">
                            {siteName}
                        </h2>
                    )
                )}
            </div>

            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar py-2">
                <SidebarItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" isCollapsed={isCollapsed} pathname={pathname} />
                <SidebarItem href="/clients" icon={<Users size={20} />} label="Clienti" isCollapsed={isCollapsed} pathname={pathname} />
                <SidebarItem href="/workouts" icon={<ClipboardList size={20} />} label="Schede" isCollapsed={isCollapsed} pathname={pathname} />
                <SidebarItem href="/exercises" icon={<Dumbbell size={20} />} label="Esercizi" isCollapsed={isCollapsed} pathname={pathname} />
                <SidebarItem href="/services" icon={<Wallet size={20} />} label="Servizi" isCollapsed={isCollapsed} pathname={pathname} />
                {/* <SidebarItem href="/documents" icon={<FileText size={20} />} label="Documenti" isCollapsed={isCollapsed} pathname={pathname} /> */}
            </nav>

            <div className="p-4 space-y-1.5">
                <div className="border-t border-white/10 pt-3 space-y-1.5">
                    <SidebarItem href="/settings" icon={<Settings size={20} />} label="Impostazioni" isCollapsed={isCollapsed} pathname={pathname} />
                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className={cn(
                            "group w-full flex items-center rounded-xl transition-all duration-200 relative",
                            "hover:bg-white/10 active:scale-[0.98]",
                            isCollapsed ? "justify-center p-3" : "px-4 py-2.5 gap-3"
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
        </aside>
    );
}

function SidebarItem({
    href, icon, label, isCollapsed, pathname
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    isCollapsed: boolean;
    pathname: string;
}) {
    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

    return (
        <Link
            href={href}
            className={cn(
                "group flex items-center rounded-xl transition-all duration-200 relative",
                isActive ? "bg-white/15" : "hover:bg-white/10",
                "active:scale-[0.98]",
                isCollapsed ? "justify-center p-3" : "px-4 py-2.5 gap-3"
            )}
            title={isCollapsed ? label : undefined}
        >
            <div className={cn("transition-colors", isActive ? "text-white" : "text-white/70 group-hover:text-white")}>
                {icon}
            </div>
            {!isCollapsed && (
                <span className={cn("text-sm font-medium transition-colors", isActive ? "text-white" : "text-white/80 group-hover:text-white")}>
                    {label}
                </span>
            )}
            {/* Active indicator */}
            <div className={cn(
                "absolute left-0 w-1 rounded-full transition-all duration-300 bg-white",
                isActive ? "h-6" : "h-0 group-hover:h-4"
            )} />
        </Link>
    );
}
