"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
    deleteMealPlan,
    setActiveMealPlan,
} from "@/lib/actions/nutrition";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Plus,
    Trash2,
    CircleCheck,
    Pencil,
    Utensils,
    Calendar,
    UserRound,
    Search,
} from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RequestsTab } from "./_components/requests-tab";
import type { NutritionRequestListItem } from "@/lib/services/nutrition-requests.types";

const DEFAULT_PAGE_SIZE = 10;

type PlanRow = {
    id: number;
    nome: string;
    attivo: boolean;
    data_inizio: string;
    data_fine: string | null;
    client_id: number;
    client_nome: string | null;
    client_cognome: string | null;
};

type ClientLite = { id: number; nome: string; cognome: string };

export default function NutritionContent({
    plans,
    pendingRequestsCount,
    requests,
}: {
    plans: PlanRow[];
    clients: ClientLite[];
    pendingRequestsCount: number;
    requests: NutritionRequestListItem[];
}) {
    const [pending, startTransition] = useTransition();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const filteredPlans = useMemo(() => {
        const q = search.trim().toLowerCase();
        return plans.filter((p) => {
            if (statusFilter === "active" && !p.attivo) return false;
            if (statusFilter === "inactive" && p.attivo) return false;
            if (!q) return true;
            const haystack = `${p.nome} ${p.client_nome ?? ""} ${p.client_cognome ?? ""}`.toLowerCase();
            return haystack.includes(q);
        });
    }, [plans, search, statusFilter]);

    const filtersKey = `${search}|${statusFilter}`;
    const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
    if (prevFiltersKey !== filtersKey) {
        setPage(1);
        setPrevFiltersKey(filtersKey);
    }

    const pagedPlans = useMemo(
        () => filteredPlans.slice((page - 1) * pageSize, page * pageSize),
        [filteredPlans, page, pageSize],
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold brand-text tracking-tight">
                        Nutrizione
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Crea e assegna i piani alimentari ai tuoi atleti.
                    </p>
                </div>
                <Link href="/nutrition/new" className="w-full sm:w-auto">
                    <Button className="brand-bg text-white gap-2 shadow-lg px-6 h-11 w-full sm:w-auto">
                        <Plus size={16} /> Nuovo Piano
                    </Button>
                </Link>
            </div>

            <Tabs defaultValue="plans">
                <TabsList className="w-full overflow-x-auto justify-start sm:w-auto sm:justify-center">
                    <TabsTrigger value="plans" className="data-[state=active]:brand-bg data-[state=active]:!text-white">
                        Piani attivi ({plans.length})
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="data-[state=active]:brand-bg data-[state=active]:!text-white gap-2">
                        Richieste
                        {pendingRequestsCount > 0 && (
                            <Badge className="brand-bg !text-white border-0 ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                                {pendingRequestsCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="plans" className="mt-4">
            {plans.length === 0 ? (
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                    <CardContent className="py-16 text-center">
                        <Utensils
                            className="mx-auto text-slate-300"
                            size={48}
                            strokeWidth={1.5}
                        />
                        <p className="mt-4 text-slate-700 font-semibold">
                            Nessun piano alimentare ancora.
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            Crea il primo piano cliccando su &quot;Nuovo Piano&quot; in alto.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Cerca per nome piano o cliente…"
                                className="pl-9 border-slate-200 shadow-none h-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select
                            value={statusFilter}
                            onValueChange={(v) =>
                                setStatusFilter(v as typeof statusFilter)
                            }
                        >
                            <SelectTrigger className="w-full sm:w-[180px] border-slate-200 shadow-none h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tutti i piani</SelectItem>
                                <SelectItem value="active">Solo attivi</SelectItem>
                                <SelectItem value="inactive">Solo inattivi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {filteredPlans.length === 0 ? (
                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardContent className="py-8 text-center text-sm text-slate-500">
                                Nessun piano trovato con i filtri attuali.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {pagedPlans.map((p) => (
                                <Card
                                    key={p.id}
                                    className={`bg-white shadow-sm overflow-hidden ${
                                        p.attivo
                                            ? "border-2 brand-border"
                                            : "border border-slate-200"
                                    }`}
                                >
                                    <CardHeader
                                        className={`pb-3 ${
                                            p.attivo
                                                ? "bg-slate-50/70 border-b border-slate-100"
                                                : ""
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <CardTitle className="truncate text-base text-slate-900">
                                                    {p.nome}
                                                </CardTitle>
                                                <p className="text-sm text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
                                                    <UserRound
                                                        size={13}
                                                        className="text-slate-400 shrink-0"
                                                    />
                                                    <span className="truncate">
                                                        {p.client_nome} {p.client_cognome}
                                                    </span>
                                                </p>
                                            </div>
                                            {p.attivo && (
                                                <Badge className="brand-bg text-white shrink-0 px-2 py-0.5 text-[10px] font-bold tracking-wide">
                                                    ATTIVO
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4 pb-4 space-y-3">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Calendar size={13} className="text-slate-400" />
                                            Dal {formatDateIt(p.data_inizio)}
                                            {p.data_fine && ` al ${formatDateIt(p.data_fine)}`}
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <Link href={`/nutrition/${p.id}/edit`}>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-slate-200 text-slate-700 hover:bg-slate-50 h-8"
                                                >
                                                    <Pencil size={13} className="mr-1.5" />
                                                    Modifica
                                                </Button>
                                            </Link>
                                            {!p.attivo && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-slate-200 text-slate-700 hover:bg-slate-50 h-8"
                                                    disabled={pending}
                                                    onClick={() =>
                                                        startTransition(async () => {
                                                            const r = await setActiveMealPlan(p.id);
                                                            if (r.success) {
                                                                toast.success("Piano attivato");
                                                                window.location.reload();
                                                            } else {
                                                                toast.error(r.error || "Errore");
                                                            }
                                                        })
                                                    }
                                                >
                                                    <CircleCheck
                                                        size={13}
                                                        className="mr-1.5 brand-text"
                                                    />
                                                    Attiva
                                                </Button>
                                            )}
                                            <ConfirmDeleteDialog
                                                title={`Eliminare il piano "${p.nome}"?`}
                                                description="L'operazione è irreversibile e rimuoverà tutti i pasti associati."
                                                onConfirm={async () => {
                                                    const r = await deleteMealPlan(p.id);
                                                    if (r.success) {
                                                        toast.success("Piano eliminato");
                                                        window.location.reload();
                                                    } else {
                                                        toast.error(r.error || "Errore");
                                                    }
                                                }}
                                                trigger={
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 ml-auto"
                                                        disabled={pending}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                    <Pagination
                        page={page}
                        pageSize={pageSize}
                        total={filteredPlans.length}
                        onPageChange={setPage}
                        onPageSizeChange={(s) => {
                            setPageSize(s);
                            setPage(1);
                        }}
                    />
                </>
            )}
                </TabsContent>

                <TabsContent value="requests" className="mt-4">
                    <RequestsTab initialRequests={requests} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function formatDateIt(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}
