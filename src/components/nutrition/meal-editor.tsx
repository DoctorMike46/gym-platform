"use client";

import { useEffect, useState } from "react";
import {
    Check,
    ChevronDown,
    Copy,
    Eraser,
    Flame,
    Plus,
    Search,
    Shuffle,
    Trash2,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { searchFoodsAction } from "@/lib/actions/nutrition";
import type { FoodResult } from "@/lib/services/food-lookup.service";
import type { MealCell, MomentoMeta } from "@/lib/nutrition/meal-constants";
import type { MealItem, MealItemAlternative } from "@/lib/nutrition/types";
import { sumItems, itemsToDescription } from "@/lib/nutrition/types";

// ─── Day totals header ─────────────────────────────────────────
export function DayTotalsHeader({
    dayLabel,
    totals,
    kcalTarget,
    otherDays,
    onCopyFrom,
    onClear,
}: {
    dayLabel: string;
    totals: { kcal: number; p: number; c: number; g: number; hasAny: boolean };
    kcalTarget: number;
    otherDays: { idx: number; long: string; short: string }[];
    onCopyFrom: (sourceIdx: number) => void;
    onClear: () => void;
}) {
    const macroKcal = totals.p * 4 + totals.c * 4 + totals.g * 9;
    const totalMacroKcal = macroKcal || 1;
    const pPct = Math.round(((totals.p * 4) / totalMacroKcal) * 100);
    const cPct = Math.round(((totals.c * 4) / totalMacroKcal) * 100);
    const gPct = 100 - pPct - cPct;

    const hasTarget = kcalTarget > 0;
    const progressPct = hasTarget
        ? Math.min((totals.kcal / kcalTarget) * 100, 100)
        : 0;
    const targetStatus = !hasTarget
        ? null
        : totals.kcal < kcalTarget * 0.9
          ? "under"
          : totals.kcal > kcalTarget * 1.1
            ? "over"
            : "ok";
    const statusColor =
        targetStatus === "under"
            ? "text-amber-600"
            : targetStatus === "over"
              ? "text-rose-600"
              : targetStatus === "ok"
                ? "text-emerald-600"
                : "text-slate-500";

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 sticky top-0 z-10 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Flame size={18} className="brand-text" />
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                            Riepilogo {dayLabel}
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900 tabular-nums">
                                {totals.kcal}
                            </span>
                            <span className="text-sm text-slate-500">kcal</span>
                            {hasTarget && (
                                <span
                                    className={`text-xs font-semibold ${statusColor}`}
                                >
                                    / {kcalTarget} target
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Select
                        value=""
                        onValueChange={(v) => {
                            if (v) onCopyFrom(parseInt(v, 10));
                        }}
                    >
                        <SelectTrigger className="h-9 border-slate-200 shadow-none text-xs w-[140px]">
                            <Copy size={13} className="mr-1.5 text-slate-500" />
                            <SelectValue placeholder="Copia da..." />
                        </SelectTrigger>
                        <SelectContent>
                            {otherDays.map((d) => (
                                <SelectItem key={d.idx} value={String(d.idx)}>
                                    {d.long}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {totals.hasAny && (
                        <ConfirmDeleteDialog
                            title={`Svuotare tutti i pasti di ${dayLabel}?`}
                            description="I pasti di questo giorno verranno cancellati. Potrai sempre ricompilarli."
                            confirmLabel="Svuota"
                            onConfirm={onClear}
                            trigger={
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-9 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                >
                                    <Eraser size={14} />
                                </Button>
                            }
                        />
                    )}
                </div>
            </div>

            {hasTarget && (
                <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                        className={`h-full transition-all ${
                            targetStatus === "over"
                                ? "bg-rose-500"
                                : targetStatus === "ok"
                                  ? "bg-emerald-500"
                                  : "brand-bg"
                        }`}
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            )}

            {macroKcal > 0 && (
                <div className="mt-3 flex items-center gap-4 text-xs">
                    <MacroPill label="P" value={`${totals.p}g`} pct={pPct} color="rose" />
                    <MacroPill label="C" value={`${totals.c}g`} pct={cPct} color="sky" />
                    <MacroPill label="G" value={`${totals.g}g`} pct={gPct} color="amber" />
                </div>
            )}
        </div>
    );
}

function MacroPill({
    label,
    value,
    pct,
    color,
}: {
    label: string;
    value: string;
    pct: number;
    color: "rose" | "sky" | "amber";
}) {
    const styles = {
        rose: "bg-rose-50 text-rose-700",
        sky: "bg-sky-50 text-sky-700",
        amber: "bg-amber-50 text-amber-700",
    }[color];
    return (
        <div className="flex items-center gap-2 min-w-0">
            <div
                className={`h-6 px-2 rounded-md ${styles} font-bold text-[11px] flex items-center gap-1`}
            >
                <span>{label}</span>
                <span className="tabular-nums">{value}</span>
            </div>
            <span className="text-slate-500 tabular-nums">{pct}%</span>
        </div>
    );
}

// ─── Singola card pasto editabile ─────────────────────────────
export function MealEditorCard({
    momento,
    cell,
    onChange,
}: {
    momento: MomentoMeta;
    cell: MealCell;
    onChange: (patch: Partial<MealCell>) => void;
}) {
    const items = cell.items ?? [];
    const hasItems = items.length > 0;
    const hasLegacyDescr = !hasItems && cell.descrizione.trim().length > 0;
    const filled = hasItems || hasLegacyDescr;
    const Icon = momento.icon;
    const totalsFromItems = sumItems(items);
    const displayKcal = hasItems
        ? totalsFromItems.kcal
        : cell.kcal
          ? parseInt(cell.kcal, 10) || 0
          : 0;
    const displayP = hasItems
        ? totalsFromItems.proteine_g
        : cell.proteine
          ? parseInt(cell.proteine, 10) || 0
          : 0;
    const displayC = hasItems
        ? totalsFromItems.carbo_g
        : cell.carbo
          ? parseInt(cell.carbo, 10) || 0
          : 0;
    const displayG = hasItems
        ? totalsFromItems.grassi_g
        : cell.grassi
          ? parseInt(cell.grassi, 10) || 0
          : 0;
    const [structuredFoodOpen, setStructuredFoodOpen] = useState(false);
    const [altDialogIdx, setAltDialogIdx] = useState<number | null>(null);

    function commitItems(next: MealItem[]) {
        const totals = sumItems(next);
        onChange({
            items: next,
            descrizione: next.length > 0 ? itemsToDescription(next) : cell.descrizione,
            kcal: next.length > 0 ? String(totals.kcal) : cell.kcal,
            proteine: next.length > 0 ? String(totals.proteine_g) : cell.proteine,
            carbo: next.length > 0 ? String(totals.carbo_g) : cell.carbo,
            grassi: next.length > 0 ? String(totals.grassi_g) : cell.grassi,
        });
    }

    function addStructuredFood(food: FoodResult, grams: number) {
        const ratio = grams / 100;
        const newItem: MealItem = {
            alimento: food.nome,
            quantita_g: grams,
            kcal: Math.round((food.kcalPer100g ?? 0) * ratio),
            proteine_g: Math.round((food.proteineG ?? 0) * ratio),
            carbo_g: Math.round((food.carboG ?? 0) * ratio),
            grassi_g: Math.round((food.grassiG ?? 0) * ratio),
            note: food.brand ?? null,
            alternatives: [],
        };
        commitItems([...items, newItem]);
    }

    function removeItem(idx: number) {
        const next = items.filter((_, i) => i !== idx);
        commitItems(next);
    }

    function updateAlternatives(idx: number, alts: MealItemAlternative[]) {
        const next = items.map((it, i) =>
            i === idx ? { ...it, alternatives: alts } : it,
        );
        commitItems(next);
    }

    return (
        <div
            className={`rounded-xl transition-colors overflow-hidden ${
                filled
                    ? "border-2 brand-border bg-slate-50/40"
                    : "border border-slate-200 bg-white"
            }`}
        >
            <div
                className={`flex items-center justify-between px-4 py-3 ${
                    filled ? "bg-white/60 border-b border-slate-100" : ""
                }`}
            >
                <div className="flex items-center gap-3">
                    <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                            filled
                                ? "brand-bg text-white"
                                : "bg-slate-100 text-slate-500"
                        }`}
                    >
                        <Icon size={18} />
                    </div>
                    <div>
                        <div
                            className={`text-sm font-bold tracking-wide ${
                                filled ? "text-slate-900" : "text-slate-700"
                            }`}
                        >
                            {momento.label}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium tabular-nums">
                            ≈ {momento.orario}
                        </div>
                    </div>
                </div>
                {filled && (
                    <div className="text-right">
                        <div className="text-lg font-bold text-slate-900 leading-tight tabular-nums">
                            {displayKcal}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                            kcal
                        </div>
                    </div>
                )}
            </div>
            <div className="px-4 pt-3 pb-4 space-y-3">
                {hasItems && (
                    <div className="space-y-1.5">
                        {items.map((it, idx) => (
                            <MealItemRow
                                key={`${it.alimento}-${idx}`}
                                item={it}
                                onRemove={() => removeItem(idx)}
                                onEditAlternatives={() => setAltDialogIdx(idx)}
                            />
                        ))}
                    </div>
                )}
                {hasLegacyDescr && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
                        <div className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-1">
                            Pasto testuale (legacy)
                        </div>
                        <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                            {cell.descrizione}
                        </pre>
                        <p className="text-[10px] text-amber-700 italic mt-1.5">
                            Aggiungi alimenti strutturati qui sotto per
                            sostituire il testo.
                        </p>
                    </div>
                )}
                {!filled && (
                    <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center">
                        <p className="text-xs text-slate-500">
                            Nessun alimento. Aggiungi il primo dal pulsante qui
                            sotto: kcal e macros verranno calcolati
                            automaticamente.
                        </p>
                    </div>
                )}
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-dashed brand-border brand-text hover:bg-slate-50 h-9 w-full text-xs gap-1.5"
                    onClick={() => setStructuredFoodOpen(true)}
                >
                    <Plus size={14} />
                    Aggiungi alimento
                </Button>
                {structuredFoodOpen && (
                    <FoodSearchDialog
                        onClose={() => setStructuredFoodOpen(false)}
                        onAdd={(food, grams) => {
                            addStructuredFood(food, grams);
                            setStructuredFoodOpen(false);
                        }}
                    />
                )}
                {altDialogIdx !== null && items[altDialogIdx] && (
                    <AlternativesDialog
                        item={items[altDialogIdx]}
                        onClose={() => setAltDialogIdx(null)}
                        onSave={(alts) => {
                            updateAlternatives(altDialogIdx, alts);
                            setAltDialogIdx(null);
                        }}
                    />
                )}
                {filled && (
                    <div className="grid grid-cols-4 gap-2 px-1">
                        <MacroDisplay label="kcal" value={displayKcal} accent="slate" />
                        <MacroDisplay
                            label="P (g)"
                            value={displayP}
                            accent="rose"
                        />
                        <MacroDisplay
                            label="C (g)"
                            value={displayC}
                            accent="sky"
                        />
                        <MacroDisplay
                            label="G (g)"
                            value={displayG}
                            accent="amber"
                        />
                    </div>
                )}
                <Input
                    placeholder="Nota (es. lontano dall'allenamento, sostituibile con…)"
                    value={cell.note}
                    onChange={(e) => onChange({ note: e.target.value })}
                    className="border-slate-200 shadow-none h-9 bg-white text-sm"
                />
            </div>
        </div>
    );
}

function MacroDisplay({
    label,
    value,
    accent,
}: {
    label: string;
    value: number;
    accent: "slate" | "rose" | "sky" | "amber";
}) {
    const styles = {
        slate: "bg-slate-50 text-slate-700",
        rose: "bg-rose-50 text-rose-700",
        sky: "bg-sky-50 text-sky-700",
        amber: "bg-amber-50 text-amber-700",
    }[accent];
    return (
        <div
            className={`rounded-md py-1.5 px-2 text-center ${styles}`}
        >
            <div className="text-[10px] uppercase tracking-wider font-semibold opacity-70">
                {label}
            </div>
            <div className="text-sm font-bold tabular-nums">{value}</div>
        </div>
    );
}

function FoodSearchDialog({
    onClose,
    onAdd,
    modal = true,
}: {
    onClose: () => void;
    onAdd: (food: FoodResult, grams: number) => void;
    modal?: boolean;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<FoodResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<FoodResult | null>(null);
    const [grams, setGrams] = useState("100");

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const r = await searchFoodsAction(q);
                if (!cancelled) setResults(r);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query]);

    const gramsNum = Number(grams);
    const ratio =
        Number.isFinite(gramsNum) && gramsNum > 0 ? gramsNum / 100 : 0;
    const kcalEst =
        selected?.kcalPer100g != null
            ? Math.round(selected.kcalPer100g * ratio)
            : null;

    return (
        <Dialog open modal={modal} onOpenChange={(o) => !o && onClose()}>
            <DialogContent
                className="max-w-lg bg-white z-[60]"
                onPointerDownOutside={(e) => {
                    if (!modal) e.preventDefault();
                }}
                onInteractOutside={(e) => {
                    if (!modal) e.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle className="text-lg">Cerca alimento</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="relative">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <Input
                            autoFocus
                            placeholder="Es: pasta integrale, yogurt greco, mela…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-9 border-slate-200 shadow-none h-10"
                        />
                    </div>
                    <div className="border border-slate-200 rounded-md max-h-64 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-sm text-slate-500">
                                Cerco…
                            </div>
                        ) : results.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">
                                {query.trim().length < 2
                                    ? "Digita almeno 2 caratteri."
                                    : "Nessun risultato."}
                            </div>
                        ) : (
                            results.map((r) => {
                                const isSel = selected?.id === r.id;
                                return (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => setSelected(r)}
                                        className={`w-full max-w-full text-left px-3 py-2 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors flex items-start gap-2 overflow-hidden ${
                                            isSel ? "bg-slate-50" : ""
                                        }`}
                                    >
                                        <Check
                                            size={14}
                                            className={`mt-0.5 shrink-0 ${
                                                isSel ? "brand-text" : "opacity-0"
                                            }`}
                                        />
                                        <div className="min-w-0 flex-1 overflow-hidden">
                                            <div className="text-sm font-medium text-slate-900 truncate">
                                                {r.nome}
                                                {r.brand && (
                                                    <span className="text-slate-500 font-normal">
                                                        {" "}
                                                        · {r.brand}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-500 tabular-nums truncate">
                                                {r.kcalPer100g ?? "?"} kcal · P{" "}
                                                {r.proteineG ?? "?"} · C{" "}
                                                {r.carboG ?? "?"} · G{" "}
                                                {r.grassiG ?? "?"} / 100g
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                    {selected && (
                        <div className="rounded-lg border-2 brand-border bg-slate-50/50 p-3 space-y-2 max-w-full overflow-hidden">
                            <div
                                className="text-sm font-semibold text-slate-900 truncate"
                                title={selected.nome}
                            >
                                {selected.nome}
                                {selected.brand && (
                                    <span className="text-slate-500 font-normal">
                                        {" · "}
                                        {selected.brand}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Label className="text-xs text-slate-600 shrink-0">
                                    Quantità
                                </Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={grams}
                                    onChange={(e) => setGrams(e.target.value)}
                                    className="h-9 w-24 border-slate-200 shadow-none bg-white"
                                />
                                <span className="text-xs text-slate-600">g</span>
                                {kcalEst !== null && (
                                    <span className="ml-auto text-xs font-semibold brand-text tabular-nums">
                                        ≈ {kcalEst} kcal
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="border-slate-200"
                    >
                        Annulla
                    </Button>
                    <Button
                        type="button"
                        disabled={!selected || !ratio}
                        onClick={() => selected && onAdd(selected, gramsNum)}
                        className="brand-bg text-white"
                    >
                        Aggiungi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Riga alimento strutturato (con alternative collassabili) ─────
function MealItemRow({
    item,
    onRemove,
    onEditAlternatives,
}: {
    item: MealItem;
    onRemove: () => void;
    onEditAlternatives: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const altCount = item.alternatives.length;
    return (
        <div className="rounded-md bg-white border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-2.5 py-2">
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                        {item.quantita_g}g {item.alimento}
                    </div>
                    <div className="text-[10px] text-slate-500 tabular-nums">
                        {item.kcal} kcal · P {item.proteine_g} · C {item.carbo_g} · G{" "}
                        {item.grassi_g}
                    </div>
                </div>
                {altCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-[10px] font-semibold text-slate-600 transition-colors shrink-0"
                    >
                        <Shuffle size={11} />
                        {altCount} alt.
                        <ChevronDown
                            size={11}
                            className={`transition-transform ${
                                expanded ? "rotate-180" : ""
                            }`}
                        />
                    </button>
                )}
                <button
                    type="button"
                    onClick={onEditAlternatives}
                    className="px-2 py-1 rounded-md hover:bg-slate-100 text-[10px] font-semibold text-slate-500 transition-colors shrink-0"
                    title="Gestisci alternative"
                >
                    {altCount > 0 ? "Modifica" : "+ Alt"}
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                    title="Rimuovi"
                >
                    <Trash2 size={12} />
                </button>
            </div>
            {expanded && altCount > 0 && (
                <div className="border-t border-slate-100 bg-slate-50/40 px-2.5 py-2 space-y-1">
                    {item.alternatives.map((alt, i) => (
                        <div
                            key={`${alt.alimento}-${i}`}
                            className="flex items-center justify-between gap-2 text-xs"
                        >
                            <span className="text-slate-700">
                                {alt.quantita_g}g {alt.alimento}
                            </span>
                            <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
                                {alt.kcal} kcal · P{alt.proteine_g} · C{alt.carbo_g} ·
                                G{alt.grassi_g}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Dialog per gestire alternative di un alimento ──────────────
function AlternativesDialog({
    item,
    onClose,
    onSave,
}: {
    item: MealItem;
    onClose: () => void;
    onSave: (alternatives: MealItemAlternative[]) => void;
}) {
    const [alts, setAlts] = useState<MealItemAlternative[]>(item.alternatives);
    const [searchOpen, setSearchOpen] = useState(false);

    function addAlt(food: FoodResult, grams: number) {
        const ratio = grams / 100;
        const newAlt: MealItemAlternative = {
            alimento: food.nome,
            quantita_g: grams,
            kcal: Math.round((food.kcalPer100g ?? 0) * ratio),
            proteine_g: Math.round((food.proteineG ?? 0) * ratio),
            carbo_g: Math.round((food.carboG ?? 0) * ratio),
            grassi_g: Math.round((food.grassiG ?? 0) * ratio),
            note: food.brand ?? null,
        };
        setAlts((prev) => [...prev, newAlt]);
        setSearchOpen(false);
    }

    function removeAlt(idx: number) {
        setAlts((prev) => prev.filter((_, i) => i !== idx));
    }

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="text-lg">
                        Alternative di{" "}
                        <span className="brand-text">
                            {item.quantita_g}g {item.alimento}
                        </span>
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="text-xs text-slate-500">
                        Target macros di riferimento:{" "}
                        <strong className="text-slate-700 tabular-nums">
                            {item.kcal} kcal · P{item.proteine_g} · C{item.carbo_g} · G
                            {item.grassi_g}
                        </strong>
                    </div>
                    {alts.length === 0 ? (
                        <div className="rounded-md border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                            Nessuna alternativa. Aggiungine almeno 3 per dare al
                            cliente flessibilità.
                        </div>
                    ) : (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                            {alts.map((a, i) => {
                                const kcalDelta = a.kcal - item.kcal;
                                const close = Math.abs(kcalDelta) <= item.kcal * 0.1;
                                return (
                                    <div
                                        key={`${a.alimento}-${i}`}
                                        className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-slate-900 truncate">
                                                {a.quantita_g}g {a.alimento}
                                            </div>
                                            <div className="text-[10px] text-slate-500 tabular-nums">
                                                {a.kcal} kcal · P{a.proteine_g} · C
                                                {a.carbo_g} · G{a.grassi_g}
                                            </div>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] shrink-0 ${
                                                close
                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                                    : "bg-amber-50 border-amber-200 text-amber-700"
                                            }`}
                                        >
                                            {kcalDelta > 0 ? "+" : ""}
                                            {kcalDelta} kcal
                                        </Badge>
                                        <button
                                            type="button"
                                            onClick={() => removeAlt(i)}
                                            className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 shrink-0"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchOpen(true)}
                        className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 h-9 text-xs gap-1.5"
                    >
                        <Plus size={12} />
                        Aggiungi alternativa
                    </Button>
                </div>
                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="border-slate-200"
                    >
                        Annulla
                    </Button>
                    <Button
                        type="button"
                        onClick={() => onSave(alts)}
                        className="brand-bg text-white"
                    >
                        Salva alternative
                    </Button>
                </DialogFooter>
                {searchOpen && (
                    <FoodSearchDialog
                        modal={false}
                        onClose={() => setSearchOpen(false)}
                        onAdd={addAlt}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
