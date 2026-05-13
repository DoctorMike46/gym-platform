"use client";

import { useState, useTransition } from "react";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    CheckCircle2,
    Clock,
    X,
    Calendar,
    User,
    Mail,
    MapPin,
    Video,
    StickyNote,
    UserX,
    AlarmClock,
} from "lucide-react";
import {
    cancelAppointmentByTrainer,
    confirmAppointment,
    markAppointmentCompleted,
    markAppointmentNoShow,
} from "@/lib/actions/appointments-trainer";

type AppointmentRow = {
    id: number;
    start_at: Date;
    end_at: Date;
    status: string;
    modalita: string;
    cliente_note: string | null;
    trainer_note: string | null;
    cancelled_reason: string | null;
    confirmed_at: Date | null;
    cancelled_at: Date | null;
    created_at: Date;
    client_id: number;
    client_nome: string | null;
    client_cognome: string | null;
    client_email: string | null;
    type_id: number | null;
    type_nome: string | null;
    type_durata: number | null;
    type_colore: string | null;
};

function formatDateLong(d: Date | string): string {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function formatTime(d: Date | string): string {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function statusBadge(status: string) {
    switch (status) {
        case "pending":
            return { label: "In attesa", color: "bg-amber-50 text-amber-700 border-amber-200" };
        case "confirmed":
            return { label: "Confermata", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
        case "completed":
            return { label: "Completata", color: "bg-slate-100 text-slate-700 border-slate-200" };
        case "cancelled_client":
            return { label: "Cancellata da cliente", color: "bg-slate-100 text-slate-500 border-slate-200" };
        case "cancelled_trainer":
            return { label: "Cancellata", color: "bg-rose-50 text-rose-700 border-rose-200" };
        case "no_show":
            return { label: "Cliente assente", color: "bg-orange-50 text-orange-700 border-orange-200" };
        default:
            return { label: status, color: "bg-slate-100 text-slate-700 border-slate-200" };
    }
}

export default function BookingsContent({
    upcoming,
    pending,
    past,
}: {
    upcoming: AppointmentRow[];
    pending: AppointmentRow[];
    past: AppointmentRow[];
}) {
    const [selected, setSelected] = useState<AppointmentRow | null>(null);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Prenotazioni
                </h1>
                <p className="text-slate-500 mt-1">
                    Gestisci le richieste dei clienti, conferma o riprogramma le
                    sessioni.
                </p>
            </div>

            <Tabs defaultValue="pending">
                <TabsList className="bg-slate-100 p-1 h-10">
                    <TabsTrigger
                        value="pending"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                    >
                        <AlarmClock size={14} /> In attesa
                        {pending.length > 0 && (
                            <Badge className="brand-bg text-white h-5 px-1.5 text-[10px] ml-1">
                                {pending.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger
                        value="upcoming"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                    >
                        <Calendar size={14} /> Prossime
                        {upcoming.length > 0 && (
                            <span className="ml-1 text-[10px] text-slate-500">
                                ({upcoming.length})
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger
                        value="past"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                    >
                        <Clock size={14} /> Passate
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4">
                    <BookingList
                        items={pending}
                        emptyText="Nessuna richiesta in attesa."
                        onSelect={setSelected}
                    />
                </TabsContent>
                <TabsContent value="upcoming" className="mt-4">
                    <BookingList
                        items={upcoming}
                        emptyText="Nessuna sessione confermata nei prossimi giorni."
                        onSelect={setSelected}
                    />
                </TabsContent>
                <TabsContent value="past" className="mt-4">
                    <BookingList
                        items={past}
                        emptyText="Nessuna sessione passata."
                        onSelect={setSelected}
                    />
                </TabsContent>
            </Tabs>

            {selected && (
                <BookingDetailDialog
                    appt={selected}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
}

function BookingList({
    items,
    emptyText,
    onSelect,
}: {
    items: AppointmentRow[];
    emptyText: string;
    onSelect: (a: AppointmentRow) => void;
}) {
    if (items.length === 0) {
        return (
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="py-12 text-center">
                    <Calendar
                        className="mx-auto text-slate-300"
                        size={48}
                        strokeWidth={1.5}
                    />
                    <p className="mt-4 text-slate-700 font-semibold">
                        {emptyText}
                    </p>
                </CardContent>
            </Card>
        );
    }
    return (
        <div className="space-y-2">
            {items.map((a) => {
                const sb = statusBadge(a.status);
                return (
                    <Card
                        key={a.id}
                        className="bg-white border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50/60 transition-colors"
                        onClick={() => onSelect(a)}
                    >
                        <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className="h-12 w-12 rounded-lg flex flex-col items-center justify-center shrink-0"
                                    style={{
                                        backgroundColor:
                                            (a.type_colore ?? "#3b82f6") + "22",
                                        color: a.type_colore ?? "#3b82f6",
                                    }}
                                >
                                    <span className="text-[10px] font-bold uppercase">
                                        {new Date(a.start_at).toLocaleDateString(
                                            "it-IT",
                                            { month: "short" }
                                        )}
                                    </span>
                                    <span className="text-base font-bold leading-none">
                                        {new Date(a.start_at).getDate()}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 truncate">
                                        {a.client_nome} {a.client_cognome}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                                        <span>
                                            {formatTime(a.start_at)} –{" "}
                                            {formatTime(a.end_at)}
                                        </span>
                                        {a.type_nome && (
                                            <>
                                                <span className="text-slate-300">
                                                    ·
                                                </span>
                                                <span>{a.type_nome}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Badge
                                variant="outline"
                                className={`shrink-0 ${sb.color} text-xs`}
                            >
                                {sb.label}
                            </Badge>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

function BookingDetailDialog({
    appt,
    onClose,
}: {
    appt: AppointmentRow;
    onClose: () => void;
}) {
    const [pending, startTransition] = useTransition();
    const [trainerNote, setTrainerNote] = useState(appt.trainer_note ?? "");
    const [cancelMode, setCancelMode] = useState(false);
    const [cancelReason, setCancelReason] = useState("");

    function refresh() {
        window.location.reload();
    }

    function onConfirm() {
        startTransition(async () => {
            const r = await confirmAppointment(appt.id, trainerNote);
            if (r.success) {
                toast.success("Prenotazione confermata");
                refresh();
            } else toast.error(r.error || "Errore");
        });
    }

    function onCancel() {
        if (!cancelReason.trim()) {
            toast.error("Inserisci un motivo");
            return;
        }
        startTransition(async () => {
            const r = await cancelAppointmentByTrainer(appt.id, cancelReason);
            if (r.success) {
                toast.success("Prenotazione cancellata");
                refresh();
            } else toast.error(r.error || "Errore");
        });
    }

    function onComplete() {
        startTransition(async () => {
            const r = await markAppointmentCompleted(appt.id, trainerNote);
            if (r.success) {
                toast.success("Marcata come completata");
                refresh();
            } else toast.error(r.error || "Errore");
        });
    }

    function onNoShow() {
        if (!confirm("Confermare che il cliente non si è presentato?")) return;
        startTransition(async () => {
            const r = await markAppointmentNoShow(appt.id);
            if (r.success) {
                toast.success("Cliente segnato come assente");
                refresh();
            } else toast.error(r.error || "Errore");
        });
    }

    const sb = statusBadge(appt.status);
    const canConfirm = appt.status === "pending";
    const canCancel =
        appt.status === "pending" || appt.status === "confirmed";
    const canComplete = appt.status === "confirmed";
    const isOnline = appt.modalita === "online";

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg bg-white">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="brand-text" />
                        <DialogTitle className="text-lg text-slate-900">
                            Dettaglio prenotazione
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-base font-bold text-slate-900">
                                {formatDateLong(appt.start_at)}
                            </div>
                            <div className="text-sm text-slate-500">
                                {formatTime(appt.start_at)} –{" "}
                                {formatTime(appt.end_at)}
                            </div>
                        </div>
                        <Badge variant="outline" className={`${sb.color}`}>
                            {sb.label}
                        </Badge>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <User size={14} className="text-slate-400" />
                            <span className="font-semibold text-slate-900">
                                {appt.client_nome} {appt.client_cognome}
                            </span>
                        </div>
                        {appt.client_email && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Mail size={12} />
                                {appt.client_email}
                            </div>
                        )}
                        {appt.type_nome && (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <div
                                    className="h-2 w-2 rounded-full"
                                    style={{
                                        backgroundColor:
                                            appt.type_colore ?? "#3b82f6",
                                    }}
                                />
                                {appt.type_nome}
                                {appt.type_durata && ` · ${appt.type_durata}min`}
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            {isOnline ? (
                                <Video size={12} />
                            ) : (
                                <MapPin size={12} />
                            )}
                            <span className="capitalize">
                                {appt.modalita.replace("_", " ")}
                            </span>
                        </div>
                    </div>

                    {appt.cliente_note && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                                <StickyNote size={12} /> Nota dal cliente
                            </div>
                            <p className="text-sm text-slate-700">
                                {appt.cliente_note}
                            </p>
                        </div>
                    )}

                    {appt.cancelled_reason && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                            <div className="text-[11px] uppercase tracking-wider font-bold text-rose-600 mb-1">
                                Motivo cancellazione
                            </div>
                            <p className="text-sm text-slate-700">
                                {appt.cancelled_reason}
                            </p>
                        </div>
                    )}

                    {(canConfirm || canComplete) && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">
                                Nota interna (opzionale)
                            </label>
                            <Textarea
                                value={trainerNote}
                                onChange={(e) => setTrainerNote(e.target.value)}
                                rows={2}
                                placeholder="Visibile solo a te"
                                className="border-slate-200 shadow-none"
                            />
                        </div>
                    )}

                    {cancelMode && (
                        <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                            <label className="text-sm font-semibold text-rose-700">
                                Motivo cancellazione *
                            </label>
                            <Textarea
                                value={cancelReason}
                                onChange={(e) =>
                                    setCancelReason(e.target.value)
                                }
                                rows={2}
                                placeholder="Visibile al cliente"
                                className="border-slate-200 shadow-none bg-white"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 flex-wrap">
                    {!cancelMode ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="border-slate-200"
                            >
                                Chiudi
                            </Button>
                            {canCancel && (
                                <Button
                                    variant="outline"
                                    onClick={() => setCancelMode(true)}
                                    className="border-rose-200 text-rose-600 hover:bg-rose-50"
                                >
                                    <X size={14} className="mr-1" /> Cancella
                                </Button>
                            )}
                            {canComplete && (
                                <Button
                                    variant="outline"
                                    onClick={onNoShow}
                                    disabled={pending}
                                    className="border-slate-200 text-slate-700"
                                >
                                    <UserX size={14} className="mr-1" /> No-show
                                </Button>
                            )}
                            {canComplete && (
                                <Button
                                    onClick={onComplete}
                                    disabled={pending}
                                    className="brand-bg text-white gap-1.5"
                                >
                                    <CheckCircle2 size={14} /> Completata
                                </Button>
                            )}
                            {canConfirm && (
                                <Button
                                    onClick={onConfirm}
                                    disabled={pending}
                                    className="brand-bg text-white gap-1.5"
                                >
                                    <CheckCircle2 size={14} /> Conferma
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setCancelMode(false);
                                    setCancelReason("");
                                }}
                                className="border-slate-200"
                            >
                                Indietro
                            </Button>
                            <Button
                                onClick={onCancel}
                                disabled={pending}
                                className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                            >
                                {pending ? "Cancello…" : "Conferma cancellazione"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
