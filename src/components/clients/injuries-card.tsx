"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Activity, Plus, CheckCircle2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
    createClientInjury,
    deleteClientInjury,
    updateClientInjury,
} from "@/lib/actions/client-injuries";
import {
    BODY_PARTS,
    INJURY_TYPES,
    INJURY_GRAVITA,
    type BodyPart,
    type ClientInjury,
    type InjuryGravita,
    type InjuryType,
} from "@/lib/services/injuries.types";

const PART_LABEL: Record<BodyPart, string> = {
    spalla_sx: "Spalla sx", spalla_dx: "Spalla dx",
    gomito_sx: "Gomito sx", gomito_dx: "Gomito dx",
    polso_sx: "Polso sx", polso_dx: "Polso dx",
    mano: "Mano",
    schiena_lombare: "Schiena lombare", schiena_dorsale: "Schiena dorsale", schiena_cervicale: "Cervicale",
    collo: "Collo",
    anca_sx: "Anca sx", anca_dx: "Anca dx",
    ginocchio_sx: "Ginocchio sx", ginocchio_dx: "Ginocchio dx",
    caviglia_sx: "Caviglia sx", caviglia_dx: "Caviglia dx",
    piede: "Piede",
    altro: "Altro",
};

function gravitaBadge(g: InjuryGravita): string {
    if (g === "grave") return "bg-rose-100 text-rose-700 border-0";
    if (g === "media") return "bg-amber-100 text-amber-700 border-0";
    return "bg-yellow-100 text-yellow-700 border-0";
}

function formatDate(d: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

export function ClientInjuriesCard({
    clientId,
    injuries,
}: {
    clientId: number;
    injuries: ClientInjury[];
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);

    const [parteCorpo, setParteCorpo] = useState<BodyPart | "">("");
    const [tipo, setTipo] = useState<InjuryType | "">("");
    const [gravita, setGravita] = useState<InjuryGravita | "">("");
    const [dataEvento, setDataEvento] = useState("");
    const [note, setNote] = useState("");

    const active = injuries.filter((i) => i.stato === "attivo");
    const recovered = injuries.filter((i) => i.stato === "recuperato");

    function resetForm() {
        setParteCorpo("");
        setTipo("");
        setGravita("");
        setDataEvento("");
        setNote("");
    }

    function handleCreate() {
        if (!parteCorpo || !gravita) {
            toast.error("Parte del corpo e gravità sono obbligatori");
            return;
        }
        startTransition(async () => {
            const res = await createClientInjury(clientId, {
                parte_corpo: parteCorpo,
                tipo: tipo || null,
                gravita,
                data_evento: dataEvento || null,
                note: note || null,
            });
            if (res.success) {
                toast.success("Infortunio aggiunto");
                resetForm();
                setOpen(false);
                router.refresh();
            } else {
                toast.error("Errore durante il salvataggio");
            }
        });
    }

    function handleMarkRecovered(injuryId: number) {
        startTransition(async () => {
            const res = await updateClientInjury(injuryId, clientId, {
                stato: "recuperato",
            });
            if (res.success) {
                toast.success("Infortunio segnato come recuperato");
                router.refresh();
            } else {
                toast.error("Errore durante l'aggiornamento");
            }
        });
    }

    function handleDelete(injuryId: number) {
        startTransition(async () => {
            const res = await deleteClientInjury(injuryId, clientId);
            if (res.success) {
                toast.success("Infortunio eliminato");
                router.refresh();
            } else {
                toast.error("Errore durante l'eliminazione");
            }
        });
    }

    return (
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                    <Activity size={16} className="brand-text" />
                    Stato infortuni
                    {active.length > 0 && (
                        <Badge variant="outline" className="brand-text brand-border">
                            {active.length} attivo{active.length === 1 ? "" : "i"}
                        </Badge>
                    )}
                </CardTitle>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpen(true)}
                    className="gap-1"
                >
                    <Plus size={14} /> Aggiungi
                </Button>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
                {injuries.length === 0 ? (
                    <p className="text-sm text-slate-500 py-2">
                        Nessun infortunio registrato per questo cliente.
                    </p>
                ) : (
                    <>
                        {active.length > 0 && (
                            <ul className="space-y-2">
                                {active.map((i) => (
                                    <li key={i.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                                        <div className="flex items-start gap-2 flex-wrap">
                                            <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <strong className="text-slate-900">{PART_LABEL[i.parte_corpo as BodyPart] ?? i.parte_corpo}</strong>
                                                    <Badge variant="outline" className={gravitaBadge(i.gravita as InjuryGravita)}>
                                                        {i.gravita}
                                                    </Badge>
                                                    {i.tipo && (
                                                        <span className="text-xs text-slate-500">({i.tipo})</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Data evento: {formatDate(i.data_evento)}
                                                </p>
                                                {i.note && (
                                                    <p className="text-sm text-slate-700 mt-1.5">{i.note}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleMarkRecovered(i.id)}
                                                    disabled={pending}
                                                    className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1"
                                                >
                                                    <CheckCircle2 size={14} /> Recuperato
                                                </Button>
                                                <ConfirmDeleteDialog
                                                    title="Eliminare l'infortunio?"
                                                    description="Questa azione è irreversibile."
                                                    onConfirm={() => handleDelete(i.id)}
                                                    trigger={
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            disabled={pending}
                                                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {recovered.length > 0 && (
                            <details className="pt-2">
                                <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                                    Storico recuperati ({recovered.length})
                                </summary>
                                <ul className="mt-2 space-y-1.5">
                                    {recovered.map((i) => (
                                        <li
                                            key={i.id}
                                            className="text-xs text-slate-500 border-l-2 border-emerald-200 pl-3 py-0.5"
                                        >
                                            <strong className="text-slate-700">{PART_LABEL[i.parte_corpo as BodyPart] ?? i.parte_corpo}</strong>
                                            {" — "}
                                            {i.gravita}
                                            {" · "}
                                            recuperato {formatDate(i.data_recupero)}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </>
                )}
            </CardContent>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle>Aggiungi infortunio</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                        <div className="space-y-1">
                            <Label>Parte del corpo *</Label>
                            <Select value={parteCorpo} onValueChange={(v) => setParteCorpo(v as BodyPart)}>
                                <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
                                <SelectContent>
                                    {BODY_PARTS.map((p) => (
                                        <SelectItem key={p} value={p}>{PART_LABEL[p]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Tipo</Label>
                                <Select value={tipo} onValueChange={(v) => setTipo(v as InjuryType)}>
                                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                                    <SelectContent>
                                        {INJURY_TYPES.map((t) => (
                                            <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label>Gravità *</Label>
                                <Select value={gravita} onValueChange={(v) => setGravita(v as InjuryGravita)}>
                                    <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
                                    <SelectContent>
                                        {INJURY_GRAVITA.map((g) => (
                                            <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>Data evento</Label>
                            <Input
                                type="date"
                                value={dataEvento}
                                onChange={(e) => setDataEvento(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Note (cifrate)</Label>
                            <Textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Diagnosi, terapia in corso, limitazioni…"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                            Annulla
                        </Button>
                        <Button onClick={handleCreate} disabled={pending} className="brand-bg text-white">
                            Aggiungi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
