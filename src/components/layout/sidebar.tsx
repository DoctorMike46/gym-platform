import Link from "next/link";
import { Users, LayoutDashboard, Dumbbell, ClipboardList, Wallet, FileText, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    settings: any;
}

export function Sidebar({ isCollapsed, setIsCollapsed, settings }: SidebarProps) {
    const siteName = settings?.site_name || "Ernesto Performance";
    const primaryColor = settings?.primary_color || "#003366";
    const sidebarColor = settings?.sidebar_color || primaryColor;

    return (
        <aside
            className={cn(
                "fixed left-4 top-4 bottom-4 shadow-2xl transition-all duration-500 z-50 flex flex-col",
                "backdrop-blur-xl border border-white/10",
                isCollapsed ? "w-20 rounded-2xl" : "w-64 rounded-[2.5rem]"
            )}
            style={{
                background: `linear-gradient(135deg, ${sidebarColor}E6, #1e3a8aCC)`,
            }}
        >
            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                    "absolute -right-3 top-12 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-[#003366] hover:scale-110 transition-all duration-300 z-[60] border border-blue-100",
                    isCollapsed ? "rotate-0" : "rotate-0"
                )}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className={cn("flex items-center p-6 h-28 shrink-0", isCollapsed ? "justify-center" : "justify-between")}>
                {!isCollapsed && (
                    <h2 className="text-xl font-black tracking-tight whitespace-pre-wrap leading-tight text-white drop-shadow-sm">
                        {siteName}
                    </h2>
                )}
                {isCollapsed && (
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                        <span className="text-xl font-black text-white">
                            {siteName.substring(0, 1) || "E"}
                        </span>
                    </div>
                )}
            </div>

            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar py-2">
                <SidebarItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" isCollapsed={isCollapsed} />
                <SidebarItem href="/clients" icon={<Users size={20} />} label="Clienti" isCollapsed={isCollapsed} />
                <SidebarItem href="/workouts" icon={<ClipboardList size={20} />} label="Schede" isCollapsed={isCollapsed} />
                <SidebarItem href="/exercises" icon={<Dumbbell size={20} />} label="Esercizi" isCollapsed={isCollapsed} />
                <SidebarItem href="/services" icon={<Wallet size={20} />} label="Servizi" isCollapsed={isCollapsed} />
                <SidebarItem href="/documents" icon={<FileText size={20} />} label="Documenti" isCollapsed={isCollapsed} />
            </nav>

            <div className="p-4 space-y-3">
                <div className="border-t border-white/10 pt-3">
                    <SidebarItem href="/settings" icon={<Settings size={20} />} label="Impostazioni" isCollapsed={isCollapsed} />
                </div>
            </div>
        </aside>
    );
}

function SidebarItem({ href, icon, label, isCollapsed }: { href: string; icon: React.ReactNode; label: string; isCollapsed: boolean }) {
    return (
        <Link
            href={href}
            className={cn(
                "group flex items-center rounded-xl transition-all duration-200 relative",
                "hover:bg-white/10 active:scale-[0.98]",
                isCollapsed ? "justify-center p-3" : "px-4 py-2.5 gap-3"
            )}
            title={isCollapsed ? label : undefined}
        >
            <div className="text-white/70 group-hover:text-white transition-colors">
                {icon}
            </div>
            {!isCollapsed && <span className="text-sm font-medium text-white/80 group-hover:text-white">{label}</span>}

            {/* Active state highlight - pseudo-logic for visual feedback */}
            <div className="absolute left-0 w-1 h-0 bg-white rounded-full group-hover:h-4 transition-all duration-300" />
        </Link>
    );
}
