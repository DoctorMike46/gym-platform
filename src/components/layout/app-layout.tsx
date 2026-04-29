"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { Toaster } from "@/components/ui/sonner";
import { RegisterSW } from "@/components/pwa/register-sw";
import { InstallPrompt } from "@/components/pwa/install-prompt";

interface AppLayoutSettings {
    site_name?: string | null;
    logo_url?: string | null;
    sidebar_logo_url?: string | null;
    sidebar_color?: string | null;
    primary_color?: string | null;
}

const STANDALONE_PREFIXES = ["/login", "/forgot-password", "/reset-password", "/portal"];

export function AppLayout({
    children,
    settings,
}: {
    children: React.ReactNode;
    settings: AppLayoutSettings | null;
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
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} settings={settings} />
            <TopBar settings={settings} />
            <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
            <Toaster theme="light" />
            <RegisterSW />
            <InstallPrompt />
        </div>
    );
}
