"use client";

import { useState, useTransition } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
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
import { toast } from "sonner";
import {
    Plus,
    Pencil,
    Trash2,
    Clock,
    CalendarOff,
    Tag,
    Save,
    Calendar as CalendarIcon,
} from "lucide-react";
import {
    createAppointmentType,
    deleteAppointmentType,
    updateAppointmentType,
} from "@/lib/actions/appointment-types";
import {
    createAvailabilityOverride,
    deleteAvailabilityOverride,
    replaceAvailabilityRules,
} from "@/lib/actions/availability";

const GIORNI = [
    { idx: 1, short: "Lun", long: "Lunedì" },
    { idx: 2, short: "Mar", long: "Martedì" },
    { idx: 3, short: "Mer", long: "Mercoledì" },
    { idx: 4, short: "Gio", long: "Giovedì" },
    { idx: 5, short: "Ven", long: "Venerdì" },
    { idx: 6, short: "Sab", long: "Sabato" },
    { idx: 7, short: "Dom", long: "Domenica" },
];

type AppointmentType = {
    id: number;
    nome: string;
    descrizione: string | null;
    durata_minuti: number;
    colore_hex: string;
    prezzo_centesimi: number | null;
    modalita: string;
    is_active: boolean;
};

type AvailabilityRule = {
    id: number;
    giorno_settimana: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
};

type AvailabilityOverride = {
    id: number;
    data: string;
    tipo: string;
    start_time: string | null;
    end_time: string | null;
    motivo: string | null;
};

interface RuleDraft {
    id?: number;
    giorno_settimana: number;
    start_time: string;
    end_time: string;
}

function formatPrice(centesimi: number | null): string {
    if (centesimi === null) return "—";
    const euro = centesimi / 100;
    return `€ ${euro.toFixed(2).replace(".", ",")}`;
}

function formatDateIt(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function AvailabilityContent({
    types,
    rules,
    overrides,
}: {
    types: AppointmentType[];
    rules: AvailabilityRule[];
    overrides: AvailabilityOverride[];
}) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Disponibilità
                </h1>
                <p className="text-slate-500 mt-1">
                    Definisci tipologie di sessione, orari ricorrenti e
                    eccezioni per ferie o giorni speciali.
                </p>
            </div>

            <Tabs defaultValue="types">
                <TabsList className="bg-slate-100 p-1 h-10">
                    <TabsTrigger
                        value="types"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                    >
                        <Tag size={14} /> Tipologie
                    </TabsTrigger>
                    <TabsTrigger
                        value="rules"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                    >
                        <Clock size={14} /> Orari settimanali
                    </TabsTrigger>
                    <TabsTrigger
                        value="overrides"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                    >
                        <CalendarOff size={14} /> Eccezioni
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="types" className="mt-4">
                    <TypesSection types={types} />
                </TabsContent>
                <TabsContent value="rules" className="mt-4">
                    <RulesSection rules={rules} />
                </TabsContent>
                <TabsContent value="overrides" className="mt-4">
                    <OverridesSection overrides={overrides} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ─── Sezione Tipologie ────────────────────────────────────────
function TypesSection({ types }: { types: AppointmentType[] }) {
    const [editing, setEditing] = useState<AppointmentType | null>(null);
    const [creating, setCreating] = useState(false);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-sm text-slate-600">
                        Tipologie di sessione che il cliente potrà prenotare.
                    </p>
                </div>
                <Button
                    onClick={() => setCreating(true)}
                    className="brand-bg text-white gap-2 shadow-lg"
                >
                    <Plus size={16} /> Nuova Tipologia
                </Button>
            </div>

            {types.length === 0 ? (
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                        <Tag
                            className="mx-auto text-slate-300"
                            size={48}
                            strokeWidth={1.5}
                        />
                        <p className="mt-4 text-slate-700 font-semibold">
                            Nessuna tipologia ancora.
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            Crea ad esempio &quot;Allenamento PT 60min&quot; o
                            &quot;Consulenza alimentare 30min&quot;.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {types.map((t) => (
                        <Card
                            key={t.id}
                            className="bg-white border-slate-200 shadow-sm"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div
                                            className="h-3 w-3 rounded-full shrink-0"
                                            style={{
                                                backgroundColor: t.colore_hex,
                                            }}
                                        />
                                        <CardTitle className="text-base truncate">
                                            {t.nome}
                                        </CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {t.descrizione && (
                                    <p className="text-sm text-slate-600 line-clamp-2">
                                        {t.descrizione}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <Badge
                                        variant="outline"
                                        className="border-slate-200 text-slate-700"
                                    >
                                        {t.durata_minuti} min
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="border-slate-200 text-slate-700 capitalize"
                                    >
                                        {t.modalita.replace("_", " ")}
                                    </Badge>
                                    {t.prezzo_centesimi !== null && (
                                        <Badge className="brand-bg text-white">
                                            {formatPrice(t.prezzo_centesimi)}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-slate-200 h-8"
                                        onClick={() => setEditing(t)}
                                    >
                                        <Pencil size={13} className="mr-1.5" />
                                        Modifica
                                    </Button>
                                    <ConfirmDeleteDialog
                                        title={`Eliminare la tipologia "${t.nome}"?`}
                                        description="L'operazione è irreversibile."
                                        onConfirm={async () => {
                                            const r = await deleteAppointmentType(
                                                t.id
                                            );
                                            if (r.success) {
                                                toast.success("Eliminato");
                                                window.location.reload();
                                            } else toast.error(r.error || "Errore");
                                        }}
                                        trigger={
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-rose-600 hover:bg-rose-50 h-8 ml-auto"
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

            {(creating || editing) && (
                <TypeFormDialog
                    initial={editing}
                    onClose={() => {
                        setCreating(false);
                        setEditing(null);
                    }}
                    onSaved={() => window.location.reload()}
                />
            )}
        </div>
    );
}

function TypeFormDialog({
    initial,
    onClose,
    onSaved,
}: {
    initial: AppointmentType | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [pending, startTransition] = useTransition();
    const isEdit = !!initial;
    const [colore, setColore] = useState(initial?.colore_hex ?? "#3b82f6");
    const [modalita, setModalita] = useState(initial?.modalita ?? "in_presenza");

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg bg-white">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Tag size={18} className="brand-text" />
                        <DialogTitle className="text-lg text-slate-900">
                            {isEdit ? "Modifica tipologia" : "Nuova tipologia"}
                        </DialogTitle>
                    </div>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        fd.set("colore_hex", colore);
                        fd.set("modalita", modalita);
                        startTransition(async () => {
                            const r = isEdit
                                ? await updateAppointmentType(initial!.id, fd)
                                : await createAppointmentType(fd);
                            if (r.success) {
                                toast.success("Salvato");
                                onSaved();
                            } else toast.error(r.error || "Errore");
                        });
                    }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Nome
                        </Label>
                        <Input
                            name="nome"
                            required
                            defaultValue={initial?.nome}
                            placeholder="Es. Allenamento PT"
                            className="border-slate-200 shadow-none h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Descrizione (opzionale)
                        </Label>
                        <Textarea
                            name="descrizione"
                            defaultValue={initial?.descrizione ?? ""}
                            rows={2}
                            placeholder="Cosa include questa sessione"
                            className="border-slate-200 shadow-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                Durata (minuti)
                            </Label>
                            <Input
                                name="durata_minuti"
                                type="number"
                                min="5"
                                step="5"
                                required
                                defaultValue={initial?.durata_minuti ?? 60}
                                className="border-slate-200 shadow-none h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                Prezzo €
                            </Label>
                            <Input
                                name="prezzo_euro"
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue={
                                    initial?.prezzo_centesimi != null
                                        ? (initial.prezzo_centesimi / 100).toString()
                                        : ""
                                }
                                placeholder="es. 40"
                                className="border-slate-200 shadow-none h-10"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                Modalità
                            </Label>
                            <Select value={modalita} onValueChange={setModalita}>
                                <SelectTrigger className="border-slate-200 shadow-none h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="in_presenza">
                                        In presenza
                                    </SelectItem>
                                    <SelectItem value="online">Online</SelectItem>
                                    <SelectItem value="entrambi">Entrambi</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                Colore
                            </Label>
                            <div className="flex items-center gap-2 h-10 px-3 border border-slate-200 rounded-md">
                                <input
                                    type="color"
                                    value={colore}
                                    onChange={(e) => setColore(e.target.value)}
                                    className="h-7 w-7 rounded cursor-pointer border-0 p-0"
                                />
                                <span className="text-sm text-slate-500 tabular-nums">
                                    {colore.toUpperCase()}
                                </span>
                            </div>
                        </div>
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
                            type="submit"
                            disabled={pending}
                            className="brand-bg text-white gap-2"
                        >
                            {pending ? "Salvo…" : "Salva"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Sezione Orari settimanali ────────────────────────────────
function RulesSection({ rules }: { rules: AvailabilityRule[] }) {
    const [drafts, setDrafts] = useState<RuleDraft[]>(() =>
        rules.map((r) => ({
            id: r.id,
            giorno_settimana: r.giorno_settimana,
            start_time: r.start_time,
            end_time: r.end_time,
        }))
    );
    const [pending, startTransition] = useTransition();

    function addSlot(day: number) {
        setDrafts((prev) => [
            ...prev,
            { giorno_settimana: day, start_time: "09:00", end_time: "12:00" },
        ]);
    }

    function removeSlot(idx: number) {
        setDrafts((prev) => prev.filter((_, i) => i !== idx));
    }

    function updateSlot(idx: number, patch: Partial<RuleDraft>) {
        setDrafts((prev) =>
            prev.map((d, i) => (i === idx ? { ...d, ...patch } : d))
        );
    }

    function save() {
        startTransition(async () => {
            const r = await replaceAvailabilityRules(
                drafts.map((d) => ({
                    giorno_settimana: d.giorno_settimana,
                    start_time: d.start_time,
                    end_time: d.end_time,
                }))
            );
            if (r.success) {
                toast.success(`${r.saved ?? 0} fasce salvate`);
                window.location.reload();
            } else toast.error(r.error || "Errore");
        });
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <p className="text-sm text-slate-600">
                    Imposta le fasce orarie ricorrenti in cui sei disponibile.
                </p>
                <Button
                    onClick={save}
                    disabled={pending}
                    className="brand-bg text-white gap-2 shadow-lg"
                >
                    <Save size={16} /> {pending ? "Salvo…" : "Salva orari"}
                </Button>
            </div>

            <div className="grid gap-3">
                {GIORNI.map((g) => {
                    const daySlots = drafts
                        .map((d, idx) => ({ d, idx }))
                        .filter((x) => x.d.giorno_settimana === g.idx);
                    return (
                        <Card
                            key={g.idx}
                            className="bg-white border-slate-200 shadow-sm"
                        >
                            <CardContent className="py-4 px-4">
                                <div className="flex items-center justify-between mb-3 gap-2">
                                    <div className="font-semibold text-slate-900">
                                        {g.long}
                                        {daySlots.length === 0 && (
                                            <span className="ml-2 text-xs font-normal text-slate-400">
                                                · non disponibile
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-slate-200 gap-1.5"
                                        onClick={() => addSlot(g.idx)}
                                    >
                                        <Plus size={13} />
                                        Aggiungi fascia
                                    </Button>
                                </div>
                                {daySlots.length > 0 && (
                                    <div className="space-y-2">
                                        {daySlots.map(({ d, idx }) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2"
                                            >
                                                <Clock
                                                    size={14}
                                                    className="text-slate-400 shrink-0"
                                                />
                                                <Input
                                                    type="time"
                                                    value={d.start_time}
                                                    onChange={(e) =>
                                                        updateSlot(idx, {
                                                            start_time:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className="border-slate-200 shadow-none h-9 w-32"
                                                />
                                                <span className="text-slate-400 text-sm">
                                                    →
                                                </span>
                                                <Input
                                                    type="time"
                                                    value={d.end_time}
                                                    onChange={(e) =>
                                                        updateSlot(idx, {
                                                            end_time:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className="border-slate-200 shadow-none h-9 w-32"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-rose-600 hover:bg-rose-50 h-8 w-8 p-0"
                                                    onClick={() =>
                                                        removeSlot(idx)
                                                    }
                                                >
                                                    <Trash2 size={13} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Sezione Eccezioni / Ferie ────────────────────────────────
function OverridesSection({
    overrides,
}: {
    overrides: AvailabilityOverride[];
}) {
    const [creating, setCreating] = useState(false);
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <p className="text-sm text-slate-600">
                    Blocca giorni specifici (ferie) o imposta orari speciali.
                </p>
                <Button
                    onClick={() => setCreating(true)}
                    className="brand-bg text-white gap-2 shadow-lg"
                >
                    <Plus size={16} /> Nuova Eccezione
                </Button>
            </div>

            {overrides.length === 0 ? (
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                        <CalendarOff
                            className="mx-auto text-slate-300"
                            size={48}
                            strokeWidth={1.5}
                        />
                        <p className="mt-4 text-slate-700 font-semibold">
                            Nessuna eccezione nei prossimi 90 giorni.
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            Aggiungi giorni di ferie o orari speciali.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {overrides.map((o) => (
                        <Card
                            key={o.id}
                            className="bg-white border-slate-200 shadow-sm"
                        >
                            <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                                            o.tipo === "blocked"
                                                ? "bg-rose-50 text-rose-600"
                                                : "bg-amber-50 text-amber-600"
                                        }`}
                                    >
                                        {o.tipo === "blocked" ? (
                                            <CalendarOff size={18} />
                                        ) : (
                                            <Clock size={18} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-semibold text-slate-900">
                                            {formatDateIt(o.data)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {o.tipo === "blocked"
                                                ? o.start_time && o.end_time
                                                    ? `Bloccato ${o.start_time} – ${o.end_time}`
                                                    : "Bloccato tutto il giorno"
                                                : `Orario speciale ${o.start_time} – ${o.end_time}`}
                                            {o.motivo && ` · ${o.motivo}`}
                                        </div>
                                    </div>
                                </div>
                                <ConfirmDeleteDialog
                                    title="Eliminare l'eccezione?"
                                    description="L'eccezione di disponibilità verrà rimossa."
                                    onConfirm={async () => {
                                        const r =
                                            await deleteAvailabilityOverride(
                                                o.id
                                            );
                                        if (r.success) {
                                            toast.success("Eliminata");
                                            window.location.reload();
                                        } else
                                            toast.error(r.error || "Errore");
                                    }}
                                    trigger={
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-rose-600 hover:bg-rose-50 h-8 w-8 p-0 shrink-0"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    }
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {creating && (
                <OverrideFormDialog
                    onClose={() => setCreating(false)}
                    onSaved={() => window.location.reload()}
                />
            )}
        </div>
    );
}

function OverrideFormDialog({
    onClose,
    onSaved,
}: {
    onClose: () => void;
    onSaved: () => void;
}) {
    const [pending, startTransition] = useTransition();
    const [tipo, setTipo] = useState("blocked");
    const [tutto, setTutto] = useState(true);

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md bg-white">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <CalendarOff size={18} className="brand-text" />
                        <DialogTitle className="text-lg text-slate-900">
                            Nuova eccezione
                        </DialogTitle>
                    </div>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        fd.set("tipo", tipo);
                        if (tipo === "blocked" && tutto) {
                            fd.delete("start_time");
                            fd.delete("end_time");
                        }
                        startTransition(async () => {
                            const r = await createAvailabilityOverride(fd);
                            if (r.success) {
                                toast.success("Aggiunta");
                                onSaved();
                            } else toast.error(r.error || "Errore");
                        });
                    }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Data
                        </Label>
                        <Input
                            name="data"
                            type="date"
                            required
                            min={new Date().toISOString().slice(0, 10)}
                            className="border-slate-200 shadow-none h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Tipo
                        </Label>
                        <Select value={tipo} onValueChange={setTipo}>
                            <SelectTrigger className="border-slate-200 shadow-none h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="blocked">
                                    Bloccato (ferie)
                                </SelectItem>
                                <SelectItem value="custom">
                                    Orario speciale
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {tipo === "blocked" && (
                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={tutto}
                                onChange={(e) => setTutto(e.target.checked)}
                                className="h-4 w-4 accent-current brand-text"
                            />
                            <span className="text-sm text-slate-700">
                                Bloccato tutto il giorno
                            </span>
                        </label>
                    )}
                    {(tipo === "custom" || !tutto) && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    Da
                                </Label>
                                <Input
                                    name="start_time"
                                    type="time"
                                    required
                                    defaultValue="09:00"
                                    className="border-slate-200 shadow-none h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    A
                                </Label>
                                <Input
                                    name="end_time"
                                    type="time"
                                    required
                                    defaultValue="18:00"
                                    className="border-slate-200 shadow-none h-10"
                                />
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Motivo (opzionale)
                        </Label>
                        <Input
                            name="motivo"
                            placeholder="es. Ferie estive, congresso"
                            className="border-slate-200 shadow-none h-10"
                        />
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
                            type="submit"
                            disabled={pending}
                            className="brand-bg text-white gap-2"
                        >
                            <CalendarIcon size={14} />
                            {pending ? "Salvo…" : "Aggiungi"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
