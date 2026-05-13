"use client";

import { useEffect, useState, useTransition } from "react";
import {
    createMealPlan,
    deleteMealPlan,
    getMealPlanDetail,
    replaceMealPlanMeals,
    setActiveMealPlan,
    updateMealPlan,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    Info,
    Calendar,
    UserRound,
    Coffee,
    Apple,
    UtensilsCrossed,
    Cookie,
    Soup,
    Moon,
    Copy,
    Eraser,
    Flame,
    type LucideIcon,
} from "lucide-react";

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

interface MomentoMeta {
    value: string;
    label: string;
    icon: LucideIcon;
    orario: string;
}

const MOMENTI: readonly MomentoMeta[] = [
    { value: "colazione", label: "Colazione", icon: Coffee, orario: "07:30" },
    { value: "spuntino_mat", label: "Spuntino mattina", icon: Apple, orario: "10:30" },
    { value: "pranzo", label: "Pranzo", icon: UtensilsCrossed, orario: "13:00" },
    { value: "spuntino_pom", label: "Spuntino pomeriggio", icon: Cookie, orario: "16:30" },
    { value: "cena", label: "Cena", icon: Soup, orario: "19:30" },
    { value: "pre_nanna", label: "Pre-nanna", icon: Moon, orario: "22:00" },
] as const;

const GIORNI = [
    { idx: 1, short: "Lun", long: "Lunedì" },
    { idx: 2, short: "Mar", long: "Martedì" },
    { idx: 3, short: "Mer", long: "Mercoledì" },
    { idx: 4, short: "Gio", long: "Giovedì" },
    { idx: 5, short: "Ven", long: "Venerdì" },
    { idx: 6, short: "Sab", long: "Sabato" },
    { idx: 7, short: "Dom", long: "Domenica" },
];

interface MealCell {
    descrizione: string;
    kcal: string;
    proteine: string;
    carbo: string;
    grassi: string;
    note: string;
}

function emptyCell(): MealCell {
    return { descrizione: "", kcal: "", proteine: "", carbo: "", grassi: "", note: "" };
}

function cellKey(day: number, momento: string) {
    return `${day}-${momento}`;
}

export default function NutritionContent({
    plans,
    clients,
}: {
    plans: PlanRow[];
    clients: ClientLite[];
}) {
    const [openCreate, setOpenCreate] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
    const [pending, startTransition] = useTransition();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                        Nutrizione
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Crea e assegna i piani alimentari ai tuoi atleti.
                    </p>
                </div>
                <Button
                    onClick={() => setOpenCreate(true)}
                    className="brand-bg text-white gap-2 shadow-lg px-6 h-11 w-full sm:w-auto"
                >
                    <Plus size={16} /> Nuovo Piano
                </Button>
            </div>

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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {plans.map((p) => (
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
                                    <Calendar
                                        size={13}
                                        className="text-slate-400"
                                    />
                                    Dal {formatDateIt(p.data_inizio)}
                                    {p.data_fine &&
                                        ` al ${formatDateIt(p.data_fine)}`}
                                </div>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-slate-200 text-slate-700 hover:bg-slate-50 h-8"
                                        onClick={() => setEditingPlanId(p.id)}
                                    >
                                        <Pencil
                                            size={13}
                                            className="mr-1.5"
                                        />
                                        Modifica
                                    </Button>
                                    {!p.attivo && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-slate-200 text-slate-700 hover:bg-slate-50 h-8"
                                            disabled={pending}
                                            onClick={() =>
                                                startTransition(async () => {
                                                    const r =
                                                        await setActiveMealPlan(
                                                            p.id
                                                        );
                                                    if (r.success) {
                                                        toast.success(
                                                            "Piano attivato"
                                                        );
                                                        window.location.reload();
                                                    } else
                                                        toast.error(
                                                            r.error || "Errore"
                                                        );
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
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 ml-auto"
                                        disabled={pending}
                                        onClick={() => {
                                            if (
                                                !confirm(
                                                    `Eliminare definitivamente il piano "${p.nome}"?`
                                                )
                                            )
                                                return;
                                            startTransition(async () => {
                                                const r =
                                                    await deleteMealPlan(p.id);
                                                if (r.success) {
                                                    toast.success(
                                                        "Piano eliminato"
                                                    );
                                                    window.location.reload();
                                                } else
                                                    toast.error(
                                                        r.error || "Errore"
                                                    );
                                            });
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {openCreate && (
                <CreatePlanDialog
                    clients={clients}
                    onClose={() => setOpenCreate(false)}
                    onCreated={() => window.location.reload()}
                />
            )}

            {editingPlanId !== null && (
                <EditPlanDialog
                    planId={editingPlanId}
                    onClose={() => setEditingPlanId(null)}
                    onSaved={() => window.location.reload()}
                />
            )}
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

function CreatePlanDialog({
    clients,
    onClose,
    onCreated,
}: {
    clients: ClientLite[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const [pending, startTransition] = useTransition();
    const [clientId, setClientId] = useState<string>("");

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg bg-white">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Utensils size={18} className="brand-text" />
                        <DialogTitle className="text-lg text-slate-900">
                            Nuovo piano alimentare
                        </DialogTitle>
                    </div>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!clientId) {
                            toast.error("Seleziona un cliente");
                            return;
                        }
                        const fd = new FormData(e.currentTarget);
                        startTransition(async () => {
                            const r = await createMealPlan(
                                parseInt(clientId, 10),
                                fd
                            );
                            if (r.success) {
                                toast.success(
                                    "Piano creato. Ora puoi aggiungere i pasti dal pulsante Modifica."
                                );
                                onCreated();
                            } else toast.error(r.error || "Errore");
                        });
                    }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Cliente
                        </Label>
                        <Select value={clientId} onValueChange={setClientId}>
                            <SelectTrigger className="border-slate-200 shadow-none h-10">
                                <SelectValue placeholder="Seleziona cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map((c) => (
                                    <SelectItem
                                        key={c.id}
                                        value={String(c.id)}
                                    >
                                        {c.cognome} {c.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label
                            htmlFor="nome"
                            className="text-sm font-semibold text-slate-700"
                        >
                            Nome piano
                        </Label>
                        <Input
                            id="nome"
                            name="nome"
                            required
                            placeholder="Es. Definizione luglio"
                            className="border-slate-200 shadow-none h-10"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label
                                htmlFor="data_inizio"
                                className="text-sm font-semibold text-slate-700"
                            >
                                Data inizio
                            </Label>
                            <Input
                                id="data_inizio"
                                name="data_inizio"
                                type="date"
                                required
                                defaultValue={new Date()
                                    .toISOString()
                                    .slice(0, 10)}
                                className="border-slate-200 shadow-none h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label
                                htmlFor="data_fine"
                                className="text-sm font-semibold text-slate-700"
                            >
                                Data fine
                            </Label>
                            <Input
                                id="data_fine"
                                name="data_fine"
                                type="date"
                                className="border-slate-200 shadow-none h-10"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Macros target giornalieri (opzionali)
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                            <Input
                                id="kcal_target"
                                name="kcal_target"
                                type="number"
                                min="0"
                                placeholder="kcal"
                                className="border-slate-200 shadow-none h-10"
                            />
                            <Input
                                id="proteine_g"
                                name="proteine_g"
                                type="number"
                                min="0"
                                placeholder="Prot (g)"
                                className="border-slate-200 shadow-none h-10"
                            />
                            <Input
                                id="carbo_g"
                                name="carbo_g"
                                type="number"
                                min="0"
                                placeholder="Carbo (g)"
                                className="border-slate-200 shadow-none h-10"
                            />
                            <Input
                                id="grassi_g"
                                name="grassi_g"
                                type="number"
                                min="0"
                                placeholder="Gras (g)"
                                className="border-slate-200 shadow-none h-10"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label
                            htmlFor="note"
                            className="text-sm font-semibold text-slate-700"
                        >
                            Note (opzionali)
                        </Label>
                        <Textarea
                            id="note"
                            name="note"
                            rows={2}
                            className="border-slate-200 shadow-none"
                        />
                    </div>
                    <label
                        htmlFor="attivo"
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 cursor-pointer hover:bg-slate-50"
                    >
                        <input
                            type="checkbox"
                            id="attivo"
                            name="attivo"
                            defaultChecked
                            className="h-4 w-4 mt-0.5 accent-current brand-text"
                        />
                        <div>
                            <div className="text-sm font-semibold text-slate-700">
                                Attiva questo piano
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                                Disattiva eventuali altri piani dello stesso
                                cliente.
                            </div>
                        </div>
                    </label>
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
                            type="submit"
                            disabled={pending}
                            className="brand-bg text-white gap-2"
                        >
                            {pending ? "Creo…" : "Crea piano"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditPlanDialog({
    planId,
    onClose,
    onSaved,
}: {
    planId: number;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [pending, startTransition] = useTransition();
    const [planInfo, setPlanInfo] = useState<{
        nome: string;
        data_inizio: string;
        data_fine: string;
        note: string;
        kcal_target: string;
        proteine_g: string;
        carbo_g: string;
        grassi_g: string;
    } | null>(null);
    const [cells, setCells] = useState<Map<string, MealCell>>(new Map());

    // Carica dati piano + pasti al mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const detail = await getMealPlanDetail(planId);
            if (cancelled) return;
            if (!detail) {
                toast.error("Piano non trovato");
                onClose();
                return;
            }
            setPlanInfo({
                nome: detail.plan.nome,
                data_inizio: detail.plan.data_inizio,
                data_fine: detail.plan.data_fine ?? "",
                note: detail.plan.note ?? "",
                kcal_target: detail.plan.kcal_target?.toString() ?? "",
                proteine_g: detail.plan.proteine_g?.toString() ?? "",
                carbo_g: detail.plan.carbo_g?.toString() ?? "",
                grassi_g: detail.plan.grassi_g?.toString() ?? "",
            });
            const map = new Map<string, MealCell>();
            for (const m of detail.meals) {
                map.set(cellKey(m.giorno_settimana, m.momento), {
                    descrizione: m.descrizione,
                    kcal: m.kcal?.toString() ?? "",
                    proteine: m.proteine_g?.toString() ?? "",
                    carbo: m.carbo_g?.toString() ?? "",
                    grassi: m.grassi_g?.toString() ?? "",
                    note: m.note ?? "",
                });
            }
            setCells(map);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [planId, onClose]);

    function updateCell(day: number, momento: string, patch: Partial<MealCell>) {
        const k = cellKey(day, momento);
        setCells((prev) => {
            const next = new Map(prev);
            const current = next.get(k) ?? emptyCell();
            next.set(k, { ...current, ...patch });
            return next;
        });
    }

    /** Copia tutti i pasti dal giorno sorgente al giorno destinazione. */
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
            `Pasti copiati da ${GIORNI[sourceDay - 1].long} a ${GIORNI[destDay - 1].long}`
        );
    }

    /** Svuota tutti i pasti di un giorno. */
    function clearDay(day: number) {
        setCells((prev) => {
            const next = new Map(prev);
            for (const m of MOMENTI) {
                next.delete(cellKey(day, m.value));
            }
            return next;
        });
    }

    /** Somma kcal/macros di un giorno. */
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

    function saveInfo(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            const r = await updateMealPlan(planId, fd);
            if (r.success) toast.success("Info piano salvate");
            else toast.error(r.error || "Errore");
        });
    }

    function saveMeals() {
        const arr: {
            giorno_settimana: number;
            momento: string;
            ordine: number;
            descrizione: string;
            kcal: number | null;
            proteine_g: number | null;
            carbo_g: number | null;
            grassi_g: number | null;
            note: string | null;
        }[] = [];
        for (const day of [1, 2, 3, 4, 5, 6, 7]) {
            for (let i = 0; i < MOMENTI.length; i++) {
                const m = MOMENTI[i];
                const c = cells.get(cellKey(day, m.value));
                if (!c || !c.descrizione.trim()) continue;
                arr.push({
                    giorno_settimana: day,
                    momento: m.value,
                    ordine: i,
                    descrizione: c.descrizione.trim(),
                    kcal: c.kcal ? parseInt(c.kcal, 10) : null,
                    proteine_g: c.proteine ? parseInt(c.proteine, 10) : null,
                    carbo_g: c.carbo ? parseInt(c.carbo, 10) : null,
                    grassi_g: c.grassi ? parseInt(c.grassi, 10) : null,
                    note: c.note.trim() || null,
                });
            }
        }
        startTransition(async () => {
            const r = await replaceMealPlanMeals(planId, arr);
            if (r.success) {
                toast.success(`Salvati ${arr.length} pasti`);
                onSaved();
            } else toast.error(r.error || "Errore");
        });
    }

    if (loading || !planInfo) {
        return (
            <Dialog open onOpenChange={(o) => !o && onClose()}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle className="sr-only">
                            Caricamento piano alimentare
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-8 text-center text-slate-500">
                        Caricamento…
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Pencil size={18} className="brand-text" />
                        <DialogTitle className="text-lg text-slate-900">
                            Modifica piano:{" "}
                            <span className="brand-text">{planInfo.nome}</span>
                        </DialogTitle>
                    </div>
                </DialogHeader>
                <Tabs defaultValue="meals" className="mt-2">
                    <TabsList className="bg-slate-100 p-1 h-10">
                        <TabsTrigger
                            value="info"
                            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                        >
                            <Info size={14} />
                            Info
                        </TabsTrigger>
                        <TabsTrigger
                            value="meals"
                            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                        >
                            <Utensils size={14} />
                            Pasti
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4 mt-4">
                        <form onSubmit={saveInfo} className="space-y-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="nome-edit"
                                    className="text-sm font-semibold text-slate-700"
                                >
                                    Nome piano
                                </Label>
                                <Input
                                    id="nome-edit"
                                    name="nome"
                                    required
                                    defaultValue={planInfo.nome}
                                    className="border-slate-200 shadow-none h-10"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="data_inizio-edit"
                                        className="text-sm font-semibold text-slate-700"
                                    >
                                        Data inizio
                                    </Label>
                                    <Input
                                        id="data_inizio-edit"
                                        name="data_inizio"
                                        type="date"
                                        required
                                        defaultValue={planInfo.data_inizio.slice(
                                            0,
                                            10
                                        )}
                                        className="border-slate-200 shadow-none h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="data_fine-edit"
                                        className="text-sm font-semibold text-slate-700"
                                    >
                                        Data fine
                                    </Label>
                                    <Input
                                        id="data_fine-edit"
                                        name="data_fine"
                                        type="date"
                                        defaultValue={planInfo.data_fine.slice(
                                            0,
                                            10
                                        )}
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
                                        id="kcal_target-edit"
                                        name="kcal_target"
                                        type="number"
                                        placeholder="kcal"
                                        defaultValue={planInfo.kcal_target}
                                        className="border-slate-200 shadow-none h-10"
                                    />
                                    <Input
                                        id="proteine_g-edit"
                                        name="proteine_g"
                                        type="number"
                                        placeholder="Prot (g)"
                                        defaultValue={planInfo.proteine_g}
                                        className="border-slate-200 shadow-none h-10"
                                    />
                                    <Input
                                        id="carbo_g-edit"
                                        name="carbo_g"
                                        type="number"
                                        placeholder="Carbo (g)"
                                        defaultValue={planInfo.carbo_g}
                                        className="border-slate-200 shadow-none h-10"
                                    />
                                    <Input
                                        id="grassi_g-edit"
                                        name="grassi_g"
                                        type="number"
                                        placeholder="Gras (g)"
                                        defaultValue={planInfo.grassi_g}
                                        className="border-slate-200 shadow-none h-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label
                                    htmlFor="note-edit"
                                    className="text-sm font-semibold text-slate-700"
                                >
                                    Note
                                </Label>
                                <Textarea
                                    id="note-edit"
                                    name="note"
                                    rows={2}
                                    defaultValue={planInfo.note}
                                    className="border-slate-200 shadow-none"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={pending}
                                className="brand-bg text-white gap-2"
                            >
                                {pending ? "Salvo…" : "Salva info"}
                            </Button>
                        </form>
                    </TabsContent>

                    <TabsContent value="meals" className="mt-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 mb-4 flex gap-2 items-start">
                            <Info
                                size={14}
                                className="brand-text shrink-0 mt-0.5"
                            />
                            <p className="text-xs text-slate-600">
                                Lascia vuota la descrizione per saltare un
                                pasto. I macros sono opzionali.
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
                                const kcalTarget = planInfo.kcal_target
                                    ? parseInt(planInfo.kcal_target, 10)
                                    : 0;
                                const otherDays = GIORNI.filter(
                                    (x) => x.idx !== g.idx
                                );
                                return (
                                    <TabsContent
                                        key={g.idx}
                                        value={String(g.idx)}
                                        className="space-y-3 mt-4"
                                    >
                                        <DayTotalsHeader
                                            dayLabel={g.long}
                                            totals={totals}
                                            kcalTarget={kcalTarget}
                                            otherDays={otherDays}
                                            onCopyFrom={(srcIdx) =>
                                                copyDay(srcIdx, g.idx)
                                            }
                                            onClear={() => clearDay(g.idx)}
                                        />
                                        {MOMENTI.map((m) => {
                                            const c =
                                                cells.get(
                                                    cellKey(g.idx, m.value)
                                                ) ?? emptyCell();
                                            return (
                                                <MealEditorCard
                                                    key={m.value}
                                                    momento={m}
                                                    cell={c}
                                                    onChange={(patch) =>
                                                        updateCell(
                                                            g.idx,
                                                            m.value,
                                                            patch
                                                        )
                                                    }
                                                />
                                            );
                                        })}
                                    </TabsContent>
                                );
                            })}
                        </Tabs>
                        <DialogFooter className="mt-6 gap-2">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="border-slate-200"
                            >
                                Chiudi
                            </Button>
                            <Button
                                onClick={saveMeals}
                                disabled={pending}
                                className="brand-bg text-white gap-2"
                            >
                                {pending ? "Salvo…" : "Salva pasti"}
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

// ─── Day totals header ─────────────────────────────────────────
function DayTotalsHeader({
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
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                if (
                                    !confirm(
                                        `Svuotare tutti i pasti di ${dayLabel}?`
                                    )
                                )
                                    return;
                                onClear();
                            }}
                            className="h-9 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                            <Eraser size={14} />
                        </Button>
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
                    <MacroPill
                        label="P"
                        value={`${totals.p}g`}
                        pct={pPct}
                        color="rose"
                    />
                    <MacroPill
                        label="C"
                        value={`${totals.c}g`}
                        pct={cPct}
                        color="sky"
                    />
                    <MacroPill
                        label="G"
                        value={`${totals.g}g`}
                        pct={gPct}
                        color="amber"
                    />
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
function MealEditorCard({
    momento,
    cell,
    onChange,
}: {
    momento: MomentoMeta;
    cell: MealCell;
    onChange: (patch: Partial<MealCell>) => void;
}) {
    const filled = cell.descrizione.trim().length > 0;
    const Icon = momento.icon;
    const kcalNum = cell.kcal ? parseInt(cell.kcal, 10) : null;

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
                {kcalNum !== null && filled && (
                    <div className="text-right">
                        <div className="text-lg font-bold text-slate-900 leading-tight tabular-nums">
                            {kcalNum}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                            kcal
                        </div>
                    </div>
                )}
            </div>
            <div className="px-4 pt-3 pb-4 space-y-3">
                <Textarea
                    rows={3}
                    placeholder={
                        "Una riga per alimento. Es:\n200g yogurt greco\n30g fiocchi d'avena\n1 banana"
                    }
                    value={cell.descrizione}
                    onChange={(e) => onChange({ descrizione: e.target.value })}
                    className="border-slate-200 shadow-none bg-white resize-none font-mono text-[13px] leading-relaxed"
                />
                <div className="grid grid-cols-4 gap-2">
                    <MacroInput
                        label="kcal"
                        value={cell.kcal}
                        onChange={(v) => onChange({ kcal: v })}
                        accent="slate"
                    />
                    <MacroInput
                        label="P (g)"
                        value={cell.proteine}
                        onChange={(v) => onChange({ proteine: v })}
                        accent="rose"
                    />
                    <MacroInput
                        label="C (g)"
                        value={cell.carbo}
                        onChange={(v) => onChange({ carbo: v })}
                        accent="sky"
                    />
                    <MacroInput
                        label="G (g)"
                        value={cell.grassi}
                        onChange={(v) => onChange({ grassi: v })}
                        accent="amber"
                    />
                </div>
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

function MacroInput({
    label,
    value,
    onChange,
    accent,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    accent: "slate" | "rose" | "sky" | "amber";
}) {
    const accentClass = {
        slate: "text-slate-500",
        rose: "text-rose-600",
        sky: "text-sky-600",
        amber: "text-amber-600",
    }[accent];
    return (
        <div className="relative">
            <Input
                type="number"
                min="0"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="border-slate-200 shadow-none h-10 bg-white text-sm pr-2 pl-2 text-right tabular-nums"
                placeholder="—"
            />
            <div
                className={`absolute left-2 top-0 h-full flex items-center pointer-events-none text-[10px] font-bold uppercase tracking-wider ${accentClass}`}
            >
                {label}
            </div>
        </div>
    );
}
