"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const SUPPRESS_DAYS = 14;

export function InstallPrompt() {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
        if (dismissedAt && Date.now() - dismissedAt < SUPPRESS_DAYS * 24 * 60 * 60 * 1000) {
            return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
            setVisible(true);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    if (!visible || !deferred) return null;

    function dismiss() {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setVisible(false);
    }

    async function install() {
        if (!deferred) return;
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") {
            setVisible(false);
        } else {
            dismiss();
        }
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-in slide-in-from-bottom duration-300">
            <button
                onClick={dismiss}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Chiudi"
            >
                <X size={16} />
            </button>
            <div className="flex items-start gap-3 pr-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Download size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Installa l&apos;app</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Aggiungila alla home per accesso rapido.
                    </p>
                </div>
            </div>
            <div className="flex gap-2 mt-3">
                <button
                    onClick={dismiss}
                    className="flex-1 h-9 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                    Più tardi
                </button>
                <button
                    onClick={install}
                    className="flex-1 h-9 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
                >
                    Installa
                </button>
            </div>
        </div>
    );
}
