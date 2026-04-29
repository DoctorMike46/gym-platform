"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Mail, RefreshCcw, Power, Loader2 } from "lucide-react";
import Link from "next/link";
import {
    inviteClient,
    resendInvite,
    revokePortalAccess,
    reactivatePortalAccess,
    getPortalStatus,
} from "@/lib/actions/portal-clients";
import { toast } from "sonner";

type Status = "never_invited" | "invited" | "expired" | "active" | "disabled" | "loading";

const labels: Record<Exclude<Status, "loading">, { text: string; color: string }> = {
    never_invited: { text: "Mai invitato", color: "bg-slate-100 text-slate-700" },
    invited: { text: "Invitato", color: "bg-amber-100 text-amber-700" },
    expired: { text: "Invito scaduto", color: "bg-rose-100 text-rose-700" },
    active: { text: "Attivo", color: "bg-emerald-100 text-emerald-700" },
    disabled: { text: "Disattivato", color: "bg-slate-200 text-slate-500" },
};

export function PortalAccessCard({ clientId }: { clientId: number }) {
    const [status, setStatus] = useState<Status>("loading");
    const [lastLogin, setLastLogin] = useState<Date | null>(null);
    const [pending, start] = useTransition();

    async function refresh() {
        try {
            const data = await getPortalStatus(clientId);
            setStatus(data.status);
            setLastLogin(data.last_login_at ? new Date(data.last_login_at) : null);
        } catch {
            setStatus("never_invited");
        }
    }

    useEffect(() => {
        refresh();
    }, [clientId]);

    function run(action: () => Promise<{ success: boolean; error?: string }>, msg: string) {
        start(async () => {
            const result = await action();
            if (result.success) {
                toast.success(msg);
                await refresh();
            } else {
                toast.error(result.error || "Errore");
            }
        });
    }

    if (status === "loading") {
        return (
            <Card>
                <CardContent className="py-8 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-slate-400" />
                </CardContent>
            </Card>
        );
    }

    const label = labels[status];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <UserCheck size={18} />
                    Portale Cliente
                </CardTitle>
                <Badge className={label.color}>{label.text}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                {lastLogin && (
                    <p className="text-xs text-slate-500">
                        Ultimo accesso: {lastLogin.toLocaleString("it-IT")}
                    </p>
                )}

                <div className="flex flex-wrap gap-2">
                    {status === "never_invited" && (
                        <Button
                            disabled={pending}
                            onClick={() => run(() => inviteClient(clientId), "Invito inviato")}
                            size="sm"
                            className="gap-2"
                        >
                            <Mail size={14} /> Invia invito
                        </Button>
                    )}

                    {(status === "invited" || status === "expired") && (
                        <>
                            <Button
                                disabled={pending}
                                onClick={() => run(() => resendInvite(clientId), "Invito reinviato")}
                                size="sm"
                                className="gap-2"
                            >
                                <RefreshCcw size={14} /> Reinvia invito
                            </Button>
                            <Button
                                disabled={pending}
                                onClick={() => run(() => revokePortalAccess(clientId), "Accesso revocato")}
                                size="sm"
                                variant="outline"
                                className="gap-2"
                            >
                                <Power size={14} /> Annulla
                            </Button>
                        </>
                    )}

                    {status === "active" && (
                        <Button
                            disabled={pending}
                            onClick={() => run(() => revokePortalAccess(clientId), "Accesso disattivato")}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                        >
                            <Power size={14} /> Disattiva accesso
                        </Button>
                    )}

                    {status === "disabled" && (
                        <Button
                            disabled={pending}
                            onClick={() => run(() => reactivatePortalAccess(clientId), "Accesso riattivato")}
                            size="sm"
                            className="gap-2"
                        >
                            <Power size={14} /> Riattiva accesso
                        </Button>
                    )}
                </div>

                <p className="text-xs text-slate-400">
                    Il cliente potrà accedere al portale per consultare schede, progressi e documenti.
                </p>

                <Link
                    href={`/clients/${clientId}/diary`}
                    className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-4"
                >
                    Vedi diario allenamenti e progressi →
                </Link>
            </CardContent>
        </Card>
    );
}
