"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Inbox, Search, Calendar, UserRound, ChevronRight } from "lucide-react";
import { RequestDetailDialog } from "./request-detail-dialog";
import type { NutritionRequestListItem } from "@/lib/services/nutrition-requests.service";

const STATUS_LABEL: Record<string, string> = {
    pending: "In attesa",
    in_review: "In revisione",
    approved: "Approvata",
    declined: "Rifiutata",
};

function statusBadgeClass(status: string): string {
    if (status === "pending") return "brand-bg !text-white border-0";
    if (status === "in_review") return "brand-text brand-border";
    if (status === "approved") return "bg-emerald-100 text-emerald-700 border-0";
    if (status === "declined") return "bg-rose-100 text-rose-700 border-0";
    return "";
}

function formatDate(d: Date | string): string {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export function RequestsTab({
    initialRequests,
}: {
    initialRequests: NutritionRequestListItem[];
}) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_review" | "approved" | "declined">("all");
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return initialRequests.filter((r) => {
            if (statusFilter !== "all" && r.status !== statusFilter) return false;
            if (!q) return true;
            return `${r.client_nome} ${r.client_cognome}`.toLowerCase().includes(q);
        });
    }, [initialRequests, search, statusFilter]);

    if (initialRequests.length === 0) {
        return (
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="py-16 text-center">
                    <Inbox className="mx-auto text-slate-300" size={48} strokeWidth={1.5} />
                    <p className="mt-4 text-slate-700 font-semibold">Nessuna richiesta ricevuta</p>
                    <p className="text-sm text-slate-500 mt-1">
                        Quando i tuoi clienti invieranno richieste di piano alimentare dall&apos;app, le troverai qui.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Cerca per nome cliente…"
                        className="pl-9 border-slate-200 shadow-none h-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                >
                    <SelectTrigger className="w-full sm:w-[180px] border-slate-200 shadow-none h-10">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tutti gli stati</SelectItem>
                        <SelectItem value="pending">In attesa</SelectItem>
                        <SelectItem value="in_review">In revisione</SelectItem>
                        <SelectItem value="approved">Approvate</SelectItem>
                        <SelectItem value="declined">Rifiutate</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {filtered.length === 0 ? (
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="py-8 text-center text-sm text-slate-500">
                        Nessuna richiesta corrisponde ai filtri.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {filtered.map((r) => (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedId(r.id)}
                            className="text-left bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:brand-border transition-all p-4 flex items-center gap-4"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                                        <UserRound size={14} className="text-slate-400" />
                                        {r.client_nome} {r.client_cognome}
                                    </span>
                                    <Badge variant="outline" className={statusBadgeClass(r.status)}>
                                        {STATUS_LABEL[r.status]}
                                    </Badge>
                                </div>
                                <div className="mt-2 text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} /> {formatDate(r.requested_at)}
                                    </span>
                                    {r.obiettivo && (
                                        <span className="capitalize">Obiettivo: <strong className="text-slate-700">{r.obiettivo}</strong></span>
                                    )}
                                    {r.timeframe_settimane && (
                                        <span>{r.timeframe_settimane} settimane</span>
                                    )}
                                </div>
                            </div>
                            <ChevronRight className="text-slate-300 shrink-0" />
                        </button>
                    ))}
                </div>
            )}

            <RequestDetailDialog
                id={selectedId}
                onClose={() => setSelectedId(null)}
                onChanged={() => router.refresh()}
            />
        </div>
    );
}
