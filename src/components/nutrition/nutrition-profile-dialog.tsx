"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { X, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
    getNutritionProfile,
    upsertNutritionProfile,
    type NutritionProfileData,
} from "@/lib/actions/nutrition";
import {
    ACTIVITY_LABELS,
    OBIETTIVO_LABELS,
    type LivelloAttivita,
    type Obiettivo,
    type Sesso,
} from "@/lib/nutrition/calcs";

const ALLERGENI_PRESET = [
    "Glutine",
    "Lattosio",
    "Latticini",
    "Uova",
    "Frutta a guscio",
    "Arachidi",
    "Soia",
    "Pesce",
    "Crostacei",
    "Molluschi",
    "Sedano",
    "Sesamo",
    "Senape",
    "Lupini",
    "Solfiti",
];

const REGIMI: { value: string; label: string }[] = [
    { value: "onnivoro", label: "Onnivoro" },
    { value: "vegetariano", label: "Vegetariano" },
    { value: "vegano", label: "Vegano" },
    { value: "pescetariano", label: "Pescetariano" },
    { value: "altro", label: "Altro" },
];

type Props = {
    clientId: number;
    clientLabel?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved?: (profile: NutritionProfileData) => void;
};

export function NutritionProfileDialog({
    clientId,
    clientLabel,
    open,
    onOpenChange,
    onSaved,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [pending, startTransition] = useTransition();
    const [data, setData] = useState<NutritionProfileData>({
        sesso: null,
        livello_attivita: null,
        obiettivo_default: null,
        regime_alimentare: null,
        allergeni: [],
        intolleranze: null,
        preferenze_alimenti: [],
        esclusioni_alimenti: [],
        note_aggiuntive: null,
    });
    const [prefInput, setPrefInput] = useState("");
    const [exclInput, setExclInput] = useState("");

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            const r = await getNutritionProfile(clientId);
            if (cancelled) return;
            if (r) setData(r);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [open, clientId]);

    function toggleAllergene(a: string) {
        setData((d) => ({
            ...d,
            allergeni: d.allergeni.includes(a)
                ? d.allergeni.filter((x) => x !== a)
                : [...d.allergeni, a],
        }));
    }

    function addToList(field: "preferenze_alimenti" | "esclusioni_alimenti", value: string) {
        const v = value.trim();
        if (!v) return;
        setData((d) => ({
            ...d,
            [field]: d[field].includes(v) ? d[field] : [...d[field], v],
        }));
    }

    function removeFromList(
        field: "preferenze_alimenti" | "esclusioni_alimenti",
        value: string,
    ) {
        setData((d) => ({
            ...d,
            [field]: d[field].filter((x) => x !== value),
        }));
    }

    function onSave() {
        startTransition(async () => {
            const r = await upsertNutritionProfile(clientId, data);
            if (r.success) {
                toast.success("Profilo nutrizionale salvato");
                onSaved?.(data);
                onOpenChange(false);
            } else toast.error(r.error || "Errore");
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg text-slate-900">
                        Profilo nutrizionale
                        {clientLabel && (
                            <span className="text-slate-500 font-normal text-base">
                                {" "}
                                · {clientLabel}
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                        Caricamento…
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Anagrafica clinica */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    Sesso
                                </Label>
                                <Select
                                    value={data.sesso ?? ""}
                                    onValueChange={(v) =>
                                        setData((d) => ({
                                            ...d,
                                            sesso: (v as Sesso) || null,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="border-slate-200 shadow-none h-10">
                                        <SelectValue placeholder="Seleziona" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="M">Uomo</SelectItem>
                                        <SelectItem value="F">Donna</SelectItem>
                                        <SelectItem value="altro">Altro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    Livello di attività
                                </Label>
                                <Select
                                    value={data.livello_attivita ?? ""}
                                    onValueChange={(v) =>
                                        setData((d) => ({
                                            ...d,
                                            livello_attivita:
                                                (v as LivelloAttivita) || null,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="border-slate-200 shadow-none h-10">
                                        <SelectValue placeholder="Seleziona" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(ACTIVITY_LABELS) as LivelloAttivita[]).map(
                                            (k) => (
                                                <SelectItem key={k} value={k}>
                                                    {ACTIVITY_LABELS[k]}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    Obiettivo predefinito
                                </Label>
                                <Select
                                    value={data.obiettivo_default ?? ""}
                                    onValueChange={(v) =>
                                        setData((d) => ({
                                            ...d,
                                            obiettivo_default:
                                                (v as Obiettivo) || null,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="border-slate-200 shadow-none h-10">
                                        <SelectValue placeholder="Seleziona" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(OBIETTIVO_LABELS) as Obiettivo[]).map(
                                            (k) => (
                                                <SelectItem key={k} value={k}>
                                                    {OBIETTIVO_LABELS[k]}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    Regime alimentare
                                </Label>
                                <Select
                                    value={data.regime_alimentare ?? ""}
                                    onValueChange={(v) =>
                                        setData((d) => ({
                                            ...d,
                                            regime_alimentare: v || null,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="border-slate-200 shadow-none h-10">
                                        <SelectValue placeholder="Seleziona" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REGIMI.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Allergeni */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                <AlertTriangle
                                    size={14}
                                    className="text-rose-500"
                                />
                                Allergeni
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                                {ALLERGENI_PRESET.map((a) => {
                                    const sel = data.allergeni.includes(a);
                                    return (
                                        <button
                                            key={a}
                                            type="button"
                                            onClick={() => toggleAllergene(a)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                                                sel
                                                    ? "bg-rose-50 border-rose-300 text-rose-700"
                                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                            }`}
                                        >
                                            {a}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Intolleranze */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                Intolleranze (testo libero)
                            </Label>
                            <Input
                                value={data.intolleranze ?? ""}
                                onChange={(e) =>
                                    setData((d) => ({
                                        ...d,
                                        intolleranze: e.target.value || null,
                                    }))
                                }
                                placeholder="Es. fruttosio, istamina…"
                                className="border-slate-200 shadow-none h-10"
                            />
                        </div>

                        {/* Preferenze */}
                        <ChipListField
                            label="❤️ Alimenti graditi"
                            placeholder="Aggiungi alimento gradito"
                            items={data.preferenze_alimenti}
                            value={prefInput}
                            onValueChange={setPrefInput}
                            onAdd={() => {
                                addToList("preferenze_alimenti", prefInput);
                                setPrefInput("");
                            }}
                            onRemove={(v) => removeFromList("preferenze_alimenti", v)}
                            accent="emerald"
                        />

                        {/* Esclusioni */}
                        <ChipListField
                            label="❌ Alimenti da escludere"
                            placeholder="Aggiungi alimento da escludere"
                            items={data.esclusioni_alimenti}
                            value={exclInput}
                            onValueChange={setExclInput}
                            onAdd={() => {
                                addToList("esclusioni_alimenti", exclInput);
                                setExclInput("");
                            }}
                            onRemove={(v) => removeFromList("esclusioni_alimenti", v)}
                            accent="slate"
                        />

                        {/* Note */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                Note aggiuntive
                            </Label>
                            <Textarea
                                rows={2}
                                value={data.note_aggiuntive ?? ""}
                                onChange={(e) =>
                                    setData((d) => ({
                                        ...d,
                                        note_aggiuntive: e.target.value || null,
                                    }))
                                }
                                placeholder="Note generiche, abitudini, orari pasti…"
                                className="border-slate-200 shadow-none"
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="border-slate-200"
                    >
                        Annulla
                    </Button>
                    <Button
                        type="button"
                        disabled={pending || loading}
                        onClick={onSave}
                        className="brand-bg text-white"
                    >
                        {pending ? "Salvo…" : "Salva profilo"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ChipListField({
    label,
    placeholder,
    items,
    value,
    onValueChange,
    onAdd,
    onRemove,
    accent,
}: {
    label: string;
    placeholder: string;
    items: string[];
    value: string;
    onValueChange: (v: string) => void;
    onAdd: () => void;
    onRemove: (v: string) => void;
    accent: "emerald" | "slate";
}) {
    const chipClass =
        accent === "emerald"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-slate-100 border-slate-200 text-slate-700";
    return (
        <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">{label}</Label>
            <div className="flex gap-2">
                <Input
                    value={value}
                    onChange={(e) => onValueChange(e.target.value)}
                    placeholder={placeholder}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            onAdd();
                        }
                    }}
                    className="border-slate-200 shadow-none h-9"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAdd}
                    className="border-slate-200 h-9 px-3"
                >
                    <Plus size={14} />
                </Button>
            </div>
            {items.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {items.map((it) => (
                        <span
                            key={it}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${chipClass}`}
                        >
                            {it}
                            <button
                                type="button"
                                onClick={() => onRemove(it)}
                                className="hover:opacity-70"
                                aria-label={`Rimuovi ${it}`}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
