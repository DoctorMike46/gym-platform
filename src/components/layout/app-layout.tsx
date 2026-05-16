"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { Toaster } from "@/components/ui/sonner";
import { RegisterSW } from "@/components/pwa/register-sw";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { IdleTimeoutProvider } from "@/components/system/idle-timeout-provider";

interface AppLayoutSettings {
    site_name?: string | null;
    logo_url?: string | null;
    sidebar_logo_url?: string | null;
    sidebar_color?: string | null;
    primary_color?: string | null;
}

export interface TrainerCounters {
    pendingBookings: number;
    unreadMessages: number;
}

const STANDALONE_PREFIXES = ["/login", "/forgot-password", "/reset-password", "/portal"];

export function AppLayout({
    children,
    settings,
    counters,
}: {
    children: React.ReactNode;
    settings: AppLayoutSettings | null;
    counters: TrainerCounters | null;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const isStandalone = STANDALONE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

    if (isStandalone) {
        return (
            <>
                {children}
                <Toaster theme="light" />
                <RegisterSW />
                <InstallPrompt />
            </>
        );
    }

    return (
        <IdleTimeoutProvider>
            <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
                <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} settings={settings} />
                <TopBar settings={settings} counters={counters} />
                <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
                <Toaster theme="light" />
                <RegisterSW />
                <InstallPrompt />
            </div>
        </IdleTimeoutProvider>
    );
}
