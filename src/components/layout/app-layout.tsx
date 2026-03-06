"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

export function AppLayout({ children, settings }: { children: React.ReactNode, settings: any }) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const pathname = usePathname()
    const isLoginPage = pathname === "/login"

    if (isLoginPage) {
        return (
            <>
                {children}
                <Toaster theme="light" />
            </>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} settings={settings} />
            <main className={cn(
                "flex-1 p-8 transition-all duration-500",
                isCollapsed ? "ml-[112px]" : "ml-[288px]"
            )}>
                {children}
            </main>
            <Toaster theme="light" />
        </div>
    )
}
