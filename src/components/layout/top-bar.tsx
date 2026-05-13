"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, MessageCircle, CalendarCheck } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";

interface TopBarProps {
    settings: {
        site_name?: string | null;
        logo_url?: string | null;
        sidebar_logo_url?: string | null;
        sidebar_color?: string | null;
    } | null;
    counters: {
        pendingBookings: number;
        unreadMessages: number;
    } | null;
}

export function TopBar({ settings, counters }: TopBarProps) {
    const [open, setOpen] = useState(false);
    const sidebarColor = settings?.sidebar_color || "#003366";
    const siteName = settings?.site_name || "Ernesto Performance";
    const logoUrl = settings?.sidebar_logo_url || settings?.logo_url || "";
    const unreadMessages = counters?.unreadMessages ?? 0;
    const pendingBookings = counters?.pendingBookings ?? 0;

    return (
        <>
            <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-1 px-3 h-14 border-b border-slate-200 bg-white/95 backdrop-blur">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Apri menu"
                    className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-slate-100 active:scale-95 transition shrink-0"
                >
                    <Menu size={22} className="text-slate-700" />
                </button>
                <div className="flex-1 flex items-center justify-center min-w-0 px-2">
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt={siteName}
                            className="h-8 max-w-[140px] object-contain"
                        />
                    ) : (
                        <span className="text-sm font-bold text-slate-900 truncate">
                            {siteName}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    <NotificationIconLink
                        href="/bookings"
                        icon={<CalendarCheck size={20} className="text-slate-700" />}
                        count={pendingBookings}
                        label="Prenotazioni in attesa"
                    />
                    <NotificationIconLink
                        href="/chat"
                        icon={<MessageCircle size={20} className="text-slate-700" />}
                        count={unreadMessages}
                        label="Messaggi non letti"
                    />
                </div>
            </header>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    side="left"
                    hideClose
                    className="p-0 w-[78vw] max-w-[300px] border-0 flex flex-col"
                    style={{
                        background: `linear-gradient(135deg, ${sidebarColor}f2, #1e3a8ae6)`,
                    }}
                >
                    <SheetTitle className="sr-only">Menu navigazione</SheetTitle>
                    <SidebarContent
                        isCollapsed={false}
                        settings={settings}
                        onNavigate={() => setOpen(false)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}

function NotificationIconLink({
    href,
    icon,
    count,
    label,
}: {
    href: string;
    icon: React.ReactNode;
    count: number;
    label: string;
}) {
    return (
        <Link
            href={href}
            aria-label={label}
            className="relative w-11 h-11 flex items-center justify-center rounded-lg hover:bg-slate-100 active:scale-95 transition"
        >
            {icon}
            {count > 0 && (
                <span
                    className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full brand-bg text-white text-[9px] font-bold flex items-center justify-center tabular-nums"
                    aria-label={`${count} ${label.toLowerCase()}`}
                >
                    {count > 99 ? "99+" : count}
                </span>
            )}
        </Link>
    );
}
