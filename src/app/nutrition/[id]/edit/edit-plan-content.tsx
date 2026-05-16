"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
    AlertTriangle,
    ArrowLeft,
    Info,
    Save,
    UserRound,
    Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    replaceMealPlanMeals,
    updateMealPlan,
    type ClientNutritionFullData,
} from "@/lib/actions/nutrition";
import {
    cellKey,
    emptyCell,
    GIORNI,
    MOMENTI,
    type MealCell,
} from "@/lib/nutrition/meal-constants";
import type { MealItem } from "@/lib/nutrition/types";
import {
    DayTotalsHeader,
    MealEditorCard,
} from "@/components/nutrition/meal-editor";

type InitialMeal = {
    giorno_settimana: number;
    momento: string;
    descrizione: string;
    kcal: number | null;
    proteine_g: number | null;
    carbo_g: number | null;
    grassi_g: number | null;
    note: string | null;
    items?: MealItem[] | null;
};

type InitialPlan = {
    nome: string;
    data_inizio: string;
    data_fine: string;
    note: string;
    kcal_target: string;
    proteine_g: string;
    carbo_g: string;
    grassi_g: string;
    attivo: boolean;
};

export function EditPlanContent({
    planId,
    initialPlan,
    initialMeals,
    clientData,
}: {
    planId: number;
    initialPlan: InitialPlan;
    initialMeals: InitialMeal[];
    clientData: ClientNutritionFullData | null;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const [planInfo, setPlanInfo] = useState<InitialPlan>(initialPlan);
    const [cells, setCells] = useState<Map<string, MealCell>>(() => {
        const map = new Map<string, MealCell>();
        for (const m of initialMeals) {
            map.set(cellKey(m.giorno_settimana, m.momento), {
                descrizione: m.descrizione,
                kcal: m.kcal?.toString() ?? "",
                proteine: m.proteine_g?.toString() ?? "",
                carbo: m.carbo_g?.toString() ?? "",
                grassi: m.grassi_g?.toString() ?? "",
                note: m.note ?? "",
                items: m.items ?? undefined,
            });
        }
        return map;
    });

    function updatePlanField<K extends keyof InitialPlan>(
        field: K,
        value: InitialPlan[K],
    ) {
        setPlanInfo((p) => ({ ...p, [field]: value }));
    }

    function updateCell(day: number, momento: string, patch: Partial<MealCell>) {
        const k = cellKey(day, momento);
        setCells((prev) => {
            const next = new Map(prev);
            const current = next.get(k) ?? emptyCell();
            next.set(k, { ...current, ...patch });
            return next;
        });
    }

    function copyDay(sourceDay: number, destDay: number) {
        setCells((prev) => {
            const next = new Map(prev);
            for (const m of MOMENTI) {
                const src = prev.get(cellKey(sourceDay, m.value));
                next.set(cellKey(destDay, m.value), src ? { ...src } : emptyCell());
            }
            return next;
        });
        toast.success(
            `Pasti copiati da ${GIORNI[sourceDay - 1].long} a ${GIORNI[destDay - 1].long}`,
        );
    }

    function clearDay(day: number) {
        setCells((prev) => {
            const next = new Map(prev);
            for (const m of MOMENTI) next.delete(cellKey(day, m.value));
            return next;
        });
    }

    function dayTotals(day: number) {
        let kcal = 0;
        let p = 0;
        let c = 0;
        let g = 0;
        let hasAny = false;
        for (const m of MOMENTI) {
            const cell = cells.get(cellKey(day, m.value));
            if (!cell || !cell.descrizione.trim()) continue;
            hasAny = true;
            if (cell.kcal) kcal += parseInt(cell.kcal, 10) || 0;
            if (cell.proteine) p += parseInt(cell.proteine, 10) || 0;
            if (cell.carbo) c += parseInt(cell.carbo, 10) || 0;
            if (cell.grassi) g += parseInt(cell.grassi, 10) || 0;
        }
        return { kcal, p, c, g, hasAny };
    }

    function saveAll() {
        startTransition(async () => {
            // 1. Aggiorno info piano
            const fd = new FormData();
            fd.append("nome", planInfo.nome);
            fd.append("data_inizio", planInfo.data_inizio.slice(0, 10));
            if (planInfo.data_fine)
                fd.append("data_fine", planInfo.data_fine.slice(0, 10));
            if (planInfo.note) fd.append("note", planInfo.note);
            if (planInfo.kcal_target) fd.append("kcal_target", planInfo.kcal_target);
            if (planInfo.proteine_g) fd.append("proteine_g", planInfo.proteine_g);
            if (planInfo.carbo_g) fd.append("carbo_g", planInfo.carbo_g);
            if (planInfo.grassi_g) fd.append("grassi_g", planInfo.grassi_g);

            const r1 = await updateMealPlan(planId, fd);
            if (!r1.success) {
                toast.error(r1.error || "Errore salvataggio info");
                return;
            }

            // 2. Sostituisco pasti
            const arr: InitialMeal[] = [];
            for (const day of [1, 2, 3, 4, 5, 6, 7]) {
                for (let i = 0; i < MOMENTI.length; i++) {
                    const m = MOMENTI[i];
                    const c = cells.get(cellKey(day, m.value));
                    if (!c || !c.descrizione.trim()) continue;
                    arr.push({
                        giorno_settimana: day,
                        momento: m.value,
                        descrizione: c.descrizione.trim(),
                        kcal: c.kcal ? parseInt(c.kcal, 10) : null,
                        proteine_g: c.proteine ? parseInt(c.proteine, 10) : null,
                        carbo_g: c.carbo ? parseInt(c.carbo, 10) : null,
                        grassi_g: c.grassi ? parseInt(c.grassi, 10) : null,
                        note: c.note.trim() || null,
                        items: c.items && c.items.length > 0 ? c.items : null,
                    });
                }
            }
            const r2 = await replaceMealPlanMeals(
                planId,
                arr.map((m, idx) => ({ ...m, ordine: idx })),
            );
            if (!r2.success) {
                toast.error(r2.error || "Errore salvataggio pasti");
                return;
            }
            toast.success(`Piano salvato (${arr.length} pasti)`);
            router.push("/nutrition");
        });
    }

    const kcalTargetNum = planInfo.kcal_target
        ? parseInt(planInfo.kcal_target, 10)
        : 0;

    return (
        <div className="space-y-4 max-w-6xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/nutrition">
                    <Button variant="ghost" size="icon" className="text-slate-500">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight truncate">
                        {planInfo.nome}
                    </h1>
                    {clientData && (
                        <p className="text-slate-500 mt-0.5 text-sm flex items-center gap-1.5">
                            <UserRound size={14} className="text-slate-400" />
                            {clientData.client.nome} {clientData.client.cognome}
                            {planInfo.attivo && (
                                <Badge className="brand-bg text-white shrink-0 px-2 py-0 text-[10px] font-bold tracking-wide ml-2">
                                    ATTIVO
                                </Badge>
                            )}
                        </p>
                    )}
                </div>
                <Button
                    onClick={saveAll}
                    disabled={pending}
                    className="brand-bg text-white gap-2"
                >
                    <Save size={16} />
                    {pending ? "Salvo…" : "Salva tutto"}
                </Button>
            </div>

            {clientData && <ClientSummaryBar data={clientData} />}

            <Tabs defaultValue="meals">
                <TabsList className="bg-slate-100 p-1 h-10">
                    <TabsTrigger
                        value="meals"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                    >
                        <Utensils size={14} />
                        Pasti
                    </TabsTrigger>
                    <TabsTrigger
                        value="info"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                    >
                        <Info size={14} />
                        Info piano
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="meals" className="mt-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 mb-4 flex gap-2 items-start">
                        <Info size={14} className="brand-text shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600">
                            Lascia vuota la descrizione per saltare un pasto. I macros
                            sono opzionali.
                        </p>
                    </div>
                    <Tabs defaultValue="1">
                        <TabsList className="w-full bg-slate-100 p-1 h-10 inline-flex md:grid md:grid-cols-7 overflow-x-auto justify-start md:justify-stretch">
                            {GIORNI.map((g) => (
                                <TabsTrigger
                                    key={g.idx}
                                    value={String(g.idx)}
                                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text text-slate-600 min-w-[60px] shrink-0"
                                >
                                    {g.short}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        {GIORNI.map((g) => {
                            const totals = dayTotals(g.idx);
                            const otherDays = GIORNI.filter((x) => x.idx !== g.idx);
                            return (
                                <TabsContent
                                    key={g.idx}
                                    value={String(g.idx)}
                                    className="space-y-3 mt-4"
                                >
                                    <DayTotalsHeader
                                        dayLabel={g.long}
                                        totals={totals}
                                        kcalTarget={kcalTargetNum}
                                        otherDays={otherDays}
                                        onCopyFrom={(srcIdx) => copyDay(srcIdx, g.idx)}
                                        onClear={() => clearDay(g.idx)}
                                    />
                                    {MOMENTI.map((m) => {
                                        const c =
                                            cells.get(cellKey(g.idx, m.value)) ??
                                            emptyCell();
                                        return (
                                            <MealEditorCard
                                                key={m.value}
                                                momento={m}
                                                cell={c}
                                                onChange={(patch) =>
                                                    updateCell(g.idx, m.value, patch)
                                                }
                                            />
                                        );
                                    })}
                                </TabsContent>
                            );
                        })}
                    </Tabs>
                </TabsContent>

                <TabsContent value="info" className="mt-4">
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    Nome piano
                                </Label>
                                <Input
                                    value={planInfo.nome}
                                    onChange={(e) =>
                                        updatePlanField("nome", e.target.value)
                                    }
                                    className="border-slate-200 shadow-none h-10"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-700">
                                        Data inizio
                                    </Label>
                                    <Input
                                        type="date"
                                        value={planInfo.data_inizio.slice(0, 10)}
                                        onChange={(e) =>
                                            updatePlanField("data_inizio", e.target.value)
                                        }
                                        className="border-slate-200 shadow-none h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-700">
                                        Data fine
                                    </Label>
                                    <Input
                                        type="date"
                                        value={planInfo.data_fine.slice(0, 10)}
                                        onChange={(e) =>
                                            updatePlanField("data_fine", e.target.value)
                                        }
                                        className="border-slate-200 shadow-none h-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    Macros target giornalieri
                                </Label>
                                <div className="grid grid-cols-4 gap-2">
                                    <Input
                                        type="number"
                                        placeholder="kcal"
                                        value={planInfo.kcal_target}
                                        onChange={(e) =>
                                            updatePlanField(
                                                "kcal_target",
                                                e.target.value,
                                            )
                                        }
                                        className="border-slate-200 shadow-none h-10"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Prot (g)"
                                        value={planInfo.proteine_g}
                                        onChange={(e) =>
                                            updatePlanField("proteine_g", e.target.value)
                                        }
                                        className="border-slate-200 shadow-none h-10"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Carbo (g)"
                                        value={planInfo.carbo_g}
                                        onChange={(e) =>
                                            updatePlanField("carbo_g", e.target.value)
                                        }
                                        className="border-slate-200 shadow-none h-10"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Gras (g)"
                                        value={planInfo.grassi_g}
                                        onChange={(e) =>
                                            updatePlanField("grassi_g", e.target.value)
                                        }
                                        className="border-slate-200 shadow-none h-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    Note
                                </Label>
                                <Textarea
                                    rows={3}
                                    value={planInfo.note}
                                    onChange={(e) =>
                                        updatePlanField("note", e.target.value)
                                    }
                                    className="border-slate-200 shadow-none"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ClientSummaryBar({ data }: { data: ClientNutritionFullData }) {
    return (
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-3 flex flex-wrap items-center gap-3 text-sm">
                {data.derived.pesoKg && (
                    <Pill label="Peso" value={`${data.derived.pesoKg} kg`} />
                )}
                {data.derived.altezzaCm && (
                    <Pill label="Altezza" value={`${data.derived.altezzaCm} cm`} />
                )}
                {data.profile?.regime_alimentare && (
                    <Badge
                        variant="outline"
                        className="bg-emerald-50 border-emerald-200 text-emerald-700"
                    >
                        🌱 {data.profile.regime_alimentare}
                    </Badge>
                )}
                {data.profile?.allergeni && data.profile.allergeni.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <AlertTriangle size={14} className="text-rose-500" />
                        {data.profile.allergeni.map((a) => (
                            <Badge
                                key={a}
                                variant="outline"
                                className="bg-rose-50 border-rose-200 text-rose-700 text-[10px]"
                            >
                                {a}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function Pill({ label, value }: { label: string; value: string }) {
    return (
        <div className="inline-flex items-baseline gap-1 px-2 py-0.5 rounded-md bg-slate-100">
            <span className="text-[10px] uppercase text-slate-500 font-semibold">
                {label}
            </span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
                {value}
            </span>
        </div>
    );
}
