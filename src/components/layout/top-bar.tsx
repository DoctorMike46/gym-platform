"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";

interface TopBarProps {
    settings: {
        site_name?: string | null;
        logo_url?: string | null;
        sidebar_logo_url?: string | null;
        sidebar_color?: string | null;
    } | null;
}

export function TopBar({ settings }: TopBarProps) {
    const [open, setOpen] = useState(false);
    const sidebarColor = settings?.sidebar_color || "#003366";
    const siteName = settings?.site_name || "Ernesto Performance";
    const logoUrl = settings?.sidebar_logo_url || settings?.logo_url || "";

    return (
        <>
            <header
                className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 h-14 border-b border-slate-200 bg-white/95 backdrop-blur"
            >
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Apri menu"
                    className="w-11 h-11 -ml-2 flex items-center justify-center rounded-lg hover:bg-slate-100 active:scale-95 transition"
                >
                    <Menu size={22} className="text-slate-700" />
                </button>
                <div className="flex-1 flex items-center justify-center min-w-0">
                    {logoUrl ? (
                        <img src={logoUrl} alt={siteName} className="h-8 max-w-[160px] object-contain" />
                    ) : (
                        <span className="text-sm font-bold text-slate-900 truncate">{siteName}</span>
                    )}
                </div>
                <div className="w-11" />
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
