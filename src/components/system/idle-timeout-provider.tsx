"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];

export function IdleTimeoutProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(WARNING_BEFORE_MS / 1000);
    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    function clearTimers() {
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        warningTimerRef.current = null;
        logoutTimerRef.current = null;
        countdownIntervalRef.current = null;
    }

    async function doLogout() {
        clearTimers();
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch {
            // ignore: forziamo comunque il redirect
        }
        router.push("/login?reason=idle");
    }

    function scheduleTimers() {
        clearTimers();
        setShowWarning(false);
        warningTimerRef.current = setTimeout(() => {
            setSecondsLeft(WARNING_BEFORE_MS / 1000);
            setShowWarning(true);
            countdownIntervalRef.current = setInterval(() => {
                setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
            }, 1000);
            logoutTimerRef.current = setTimeout(doLogout, WARNING_BEFORE_MS);
        }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
    }

    useEffect(() => {
        const onActivity = () => {
            if (showWarning) return;
            scheduleTimers();
        };
        scheduleTimers();
        for (const ev of ACTIVITY_EVENTS) {
            window.addEventListener(ev, onActivity, { passive: true });
        }
        return () => {
            for (const ev of ACTIVITY_EVENTS) {
                window.removeEventListener(ev, onActivity);
            }
            clearTimers();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showWarning]);

    function staySignedIn() {
        scheduleTimers();
    }

    return (
        <>
            {children}
            <AlertDialog
                open={showWarning}
                onOpenChange={(open) => {
                    if (!open) staySignedIn();
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sei ancora qui?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Per sicurezza verrai disconnesso tra{" "}
                            <strong>{secondsLeft}</strong> secondi a causa di
                            inattività. Clicca per continuare la sessione.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={staySignedIn}>
                            Rimani connesso
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
