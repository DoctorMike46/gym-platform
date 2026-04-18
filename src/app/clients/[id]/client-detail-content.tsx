"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    ArrowLeft, User, Mail, Weight, Ruler,
    Calendar, CreditCard, Edit2, CheckCircle2, XCircle,
    RefreshCw, Trash2, Hash, Dumbbell, Plus, Power, Activity, Download
} from "lucide-react";
import { updateClient } from "@/lib/actions/clients";
import { createSubscription, deleteSubscription, renewSubscription } from "@/lib/actions/subscriptions";
import { assignWorkoutToClient, removeWorkoutFromClient, toggleWorkoutActive } from "@/lib/actions/workout-assignments";
import { getWorkoutTemplateWithExercises } from "@/lib/actions/workouts";
import { getSettings } from "@/lib/actions/settings";
import { generateWorkoutPDF } from "@/lib/pdf-generator";
import { uploadDocument } from "@/lib/actions/documents";
import { toast } from "sonner";

export default function ClientDetailContent({
    client,
    services,
    templates,
}: {
    client: any;
    services: any[];
    templates: any[];
}) {
    const router = useRouter();
    // Edit Profile
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Subscriptions
    const [isSubOpen, setIsSubOpen] = useState(false);
    const [isRenewOpen, setIsRenewOpen] = useState(false);
    const [renewTargetSub, setRenewTargetSub] = useState<any>(null);

    // Workouts
    const [isAssignWorkoutOpen, setIsAssignWorkoutOpen] = useState(false);

    // Anamnesi upload
    const [isAnamnesiOpen, setIsAnamnesiOpen] = useState(false);
    const [anamnesiFile, setAnamnesiFile] = useState<File | null>(null);
    const [anamnesiNote, setAnamnesiNote] = useState("");
    const [anamnesiUploading, setAnamnesiUploading] = useState(false);

    const activeSub = client.subscriptions?.find((s: any) => s.status === "attivo");

    async function handleUploadAnamnesi(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!anamnesiFile) {
            toast.error("Seleziona un file");
            return;
        }
        setAnamnesiUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", anamnesiFile);
            fd.append("client_id", client.id.toString());
            fd.append("tipo_documento", "consenso");
            fd.append("data_documento", new Date().toISOString().split("T")[0]);
            if (anamnesiNote) fd.append("note", anamnesiNote);

            const result = await uploadDocument(fd);
            if (result.success) {
                toast.success("Anamnesi caricata con successo!");
                setIsAnamnesiOpen(false);
                setAnamnesiFile(null);
                setAnamnesiNote("");
                router.refresh();
            } else {
                toast.error(result.error || "Errore durante l'upload");
            }
        } catch {
            toast.error("Errore imprevisto durante l'upload");
        } finally {
            setAnamnesiUploading(false);
        }
    }

    // Profile Handlers
    async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        const fd = new FormData(e.currentTarget);
        const result = await updateClient(client.id, {
            nome: fd.get("nome") as string,
            cognome: fd.get("cognome") as string,
            email: fd.get("email") as string,
            peso: fd.get("peso") as string,
            altezza: fd.get("altezza") as string,
            eta: fd.get("eta") ? parseInt(fd.get("eta") as string) : undefined,
            data_di_nascita: fd.get("data_di_nascita") as string || undefined,
        });
        setSaving(false);
        if (result.success) {
            setIsEditOpen(false);
            toast.success("Dati aggiornati con successo!");
            router.refresh();
        } else {
            toast.error("Errore durante l'aggiornamento.");
        }
    }

    // Subscriptions Handlers
    async function handleAddSub(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const result = await createSubscription({
            client_id: client.id,
            service_id: parseInt(fd.get("service_id") as string),
            data_inizio: fd.get("data_inizio") as string,
        });
        if (result.success) {
            setIsSubOpen(false);
            toast.success("Abbonamento attivato!");
            router.refresh();
        } else {
            toast.error("Errore nell'attivazione.");
        }
    }

    async function handleDeleteSub(subId: number) {
        const result = await deleteSubscription(subId, client.id);
        if (result.success) {
            toast.success("Abbonamento disattivato.");
            router.refresh();
        } else {
            toast.error("Errore durante la disattivazione.");
        }
    }

    async function handleRenew(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!renewTargetSub) return;
        const fd = new FormData(e.currentTarget);
        const result = await renewSubscription({
            client_id: client.id,
            service_id: parseInt(fd.get("service_id") as string),
            data_inizio: fd.get("data_inizio") as string,
            old_id: renewTargetSub.id,
        });
        if (result.success) {
            setIsRenewOpen(false);
            setRenewTargetSub(null);
            toast.success("Abbonamento rinnovato!");
            router.refresh();
        } else {
            toast.error("Errore nel rinnovo.");
        }
    }

    // Workouts Handlers
    async function handleAssignWorkout(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const templateId = fd.get("template_id");
        if (!templateId) return;

        const result = await assignWorkoutToClient({
            client_id: client.id,
            template_id: parseInt(templateId as string),
        });

        if (result.success) {
            setIsAssignWorkoutOpen(false);
            toast.success("Scheda assegnata con successo!");
            router.refresh();
        } else {
            toast.error(result.error || "Errore nell'assegnazione.");
        }
    }

    async function handleRemoveWorkout(assignmentId: number) {
        const result = await removeWorkoutFromClient(assignmentId, client.id);
        if (result.success) {
            toast.success("Scheda rimossa.");
            router.refresh();
        } else {
            toast.error("Errore durante la rimozione.");
        }
    }

    async function handleToggleWorkoutActive(assignmentId: number, currentStatus: boolean) {
        const result = await toggleWorkoutActive(assignmentId, !currentStatus, client.id);
        if (result.success) {
            router.refresh();
        } else {
            toast.error("Errore modifica stato.");
        }
    }

    async function handleDownloadPDF(templateId: number, dataAssegnazione: string, e: React.MouseEvent) {
        e.preventDefault();
        try {
            toast.info("Generazione PDF in corso...");
            const [fullTemplate, settings] = await Promise.all([
                getWorkoutTemplateWithExercises(templateId),
                getSettings()
            ]);

            if (!fullTemplate) {
                toast.error("Impossibile recuperare i dati della scheda");
                return;
            }

            const formattedDate = new Date(dataAssegnazione).toLocaleDateString("it-IT", {
                day: '2-digit', month: 'long', year: 'numeric'
            });

            await generateWorkoutPDF(fullTemplate, settings, {
                nome: client.nome,
                cognome: client.cognome,
                dataAssegnazione: formattedDate
            });
        } catch (error) {
            console.error(error);
            toast.error("Errore durante la generazione del PDF");
        }
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-6 max-w-5xl">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-500 hover:text-slate-900"
                        onClick={() => router.push("/clients")}
                    >
                        <ArrowLeft size={20} />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-slate-900">
                            {client.nome} {client.cognome}
                        </h1>
                        <p className="text-slate-500 mt-0.5">{client.email}</p>
                    </div>
                    <Button className="brand-bg text-white gap-2" onClick={() => setIsEditOpen(true)}>
                        <Edit2 size={16} /> Modifica Profilo
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left col */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Dati Personali */}
                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User size={16} className="brand-text" /> Dati Personali
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <InfoRow icon={<User size={14} />} label="Nome completo" value={`${client.nome} ${client.cognome}`} />
                                    <InfoRow icon={<Mail size={14} />} label="Email" value={client.email} />
                                    <InfoRow icon={<Calendar size={14} />} label="Data nascita" value={client.data_di_nascita || "—"} />
                                    <InfoRow icon={<Hash size={14} />} label="Età" value={client.eta ? `${client.eta} anni` : "—"} />
                                    <InfoRow icon={<Weight size={14} />} label="Peso" value={client.peso ? `${client.peso} kg` : "—"} />
                                    <InfoRow icon={<Ruler size={14} />} label="Altezza" value={client.altezza ? `${client.altezza} cm` : "—"} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Schede di Allenamento */}
                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Dumbbell size={16} className="brand-text" /> Schede di Allenamento
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Link href={`/workouts/builder?client=${client.id}`}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs gap-1.5 brand-text brand-border brand-hover-bg"
                                            >
                                                <Edit2 size={12} /> Personalizzata
                                            </Button>
                                        </Link>
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs gap-1.5 brand-bg text-white"
                                            onClick={() => setIsAssignWorkoutOpen(true)}
                                        >
                                            <Plus size={12} /> Assegna
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {client.workout_assignments?.length === 0 ? (
                                    <div className="text-center py-6 bg-slate-50/50 rounded-lg border border-slate-100 border-dashed">
                                        <Dumbbell size={32} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-slate-500 text-sm">Nessuna scheda assegnata.</p>
                                        <p className="text-slate-400 text-xs mt-1">Crea una scheda personalizzata o assegna un template esistente.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {client.workout_assignments?.map((assignment: any) => (
                                            <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 shadow-sm transition-all hover:border-slate-300">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${assignment.attivo ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        <Activity size={18} />
                                                    </div>
                                                    <div>
                                                        <p className={`font-medium text-sm ${assignment.attivo ? 'text-slate-900' : 'text-slate-500'}`}>
                                                            {assignment.template?.nome_template}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            Assegnata il {new Date(assignment.data_assegnazione).toLocaleDateString("it-IT", { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={
                                                        assignment.attivo
                                                            ? "bg-blue-100 text-blue-700 border-blue-200 shadow-none hover:bg-blue-100"
                                                            : "bg-slate-100 text-slate-500 shadow-none"
                                                    }>
                                                        {assignment.attivo ? "Attiva" : "Inattiva"}
                                                    </Badge>
                                                    <div className="h-4 w-px bg-slate-200 mx-1"></div>

                                                    {/* Scarica PDF */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                                onClick={(e) => handleDownloadPDF(assignment.template_id, assignment.data_assegnazione, e)}
                                                            >
                                                                <Download size={13} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Esporta PDF</TooltipContent>
                                                    </Tooltip>

                                                    {/* Toggle Attivo */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={`h-7 w-7 ${assignment.attivo ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                                onClick={() => handleToggleWorkoutActive(assignment.id, assignment.attivo)}
                                                            >
                                                                <Power size={13} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{assignment.attivo ? 'Disattiva' : 'Attiva'}</TooltipContent>
                                                    </Tooltip>

                                                    {/* Elimina */}
                                                    <AlertDialog>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Rimuovi scheda</TooltipContent>
                                                        </Tooltip>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Rimuovi scheda</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Sei sicuro di voler rimuovere l'assegnazione di <strong>{assignment.template?.nome_template}</strong> per questo cliente?
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-rose-600 hover:bg-rose-700 text-white"
                                                                    onClick={() => handleRemoveWorkout(assignment.id)}
                                                                >
                                                                    Rimuovi
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Abbonamenti */}
                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <CreditCard size={16} className="brand-text" /> Abbonamenti
                                    </CardTitle>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs gap-1.5 brand-text brand-border brand-hover-bg"
                                        onClick={() => setIsSubOpen(true)}
                                    >
                                        <Plus size={12} /> Nuovo
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {client.subscriptions?.length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center py-4">Nessun abbonamento registrato.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {client.subscriptions?.map((sub: any) => (
                                            <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                <div>
                                                    <p className="font-medium text-slate-800 text-sm">{sub.service?.nome_servizio}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        Dal {sub.data_inizio}
                                                        {sub.data_fine && ` al ${sub.data_fine}`}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={
                                                        sub.status === "attivo"
                                                            ? "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none hover:bg-emerald-100"
                                                            : "bg-slate-100 text-slate-500 shadow-none"
                                                    }>
                                                        {sub.status === "attivo" ? "Attivo" : "Scaduto"}
                                                    </Badge>

                                                    <div className="h-4 w-px bg-slate-200 mx-1"></div>

                                                    {/* Rinnova */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                                onClick={() => {
                                                                    setRenewTargetSub(sub);
                                                                    setIsRenewOpen(true);
                                                                }}
                                                            >
                                                                <RefreshCw size={13} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Rinnova abbonamento</TooltipContent>
                                                    </Tooltip>

                                                    {/* Disattiva */}
                                                    {sub.status === "attivo" && (
                                                        <AlertDialog>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                                        >
                                                                            <Trash2 size={13} />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Disattiva abbonamento</TooltipContent>
                                                            </Tooltip>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Disattiva abbonamento</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Sei sicuro di voler disattivare <strong>{sub.service?.nome_servizio}</strong>? Lo stato verrà impostato a "Scaduto".
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-rose-600 hover:bg-rose-700 text-white"
                                                                        onClick={() => handleDeleteSub(sub.id)}
                                                                    >
                                                                        Disattiva
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-5">
                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <CardTitle className="text-base">Stato Globale</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">Abbonamento</span>
                                    {activeSub ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none hover:bg-emerald-100">Attivo</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-slate-400 border-slate-200 shadow-none">Inattivo</Badge>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">Anamnesi</span>
                                    <div className="flex items-center gap-2">
                                        {client.anamnesi_status === "firmato" ? (
                                            <div className="flex items-center gap-1.5">
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                                <span className="text-sm text-emerald-600 font-medium">Firmata</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-1.5">
                                                    <XCircle size={14} className="text-slate-400" />
                                                    <span className="text-sm text-slate-400">Non firmata</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 text-xs brand-text brand-border"
                                                    onClick={() => setIsAnamnesiOpen(true)}
                                                >
                                                    <Plus size={12} className="mr-1" /> Aggiungi
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {activeSub && (
                                    <div className="pt-3 mt-1 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 mb-1">Servizio corrente</p>
                                        <p className="text-sm font-semibold brand-text">{activeSub.service?.nome_servizio}</p>
                                    </div>
                                )}

                                {client.workout_assignments?.find((wa: any) => wa.attivo) && (
                                    <div className="pt-3 mt-1 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 mb-1">Scheda in uso</p>
                                        <p className="text-sm font-semibold text-blue-600">
                                            {client.workout_assignments.find((wa: any) => wa.attivo).template?.nome_template}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <CardTitle className="text-base">Registrazione</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-xs text-slate-400">Cliente dal</p>
                                <p className="text-sm font-medium text-slate-700 mt-0.5" suppressHydrationWarning>
                                    {new Date(client.created_at).toLocaleDateString("it-IT", {
                                        day: "2-digit", month: "long", year: "numeric"
                                    })}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Dialog Aggiungi Anamnesi */}
                <Dialog open={isAnamnesiOpen} onOpenChange={setIsAnamnesiOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <form onSubmit={handleUploadAnamnesi}>
                            <DialogHeader>
                                <DialogTitle>Aggiungi Anamnesi</DialogTitle>
                                <DialogDescription>
                                    Carica il PDF del consenso informato o dell'anamnesi firmata.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="anamnesi-file">File</Label>
                                    <Input
                                        id="anamnesi-file"
                                        type="file"
                                        accept="application/pdf,image/*"
                                        onChange={(e) => setAnamnesiFile(e.target.files?.[0] || null)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="anamnesi-note">Note (opzionale)</Label>
                                    <Input
                                        id="anamnesi-note"
                                        value={anamnesiNote}
                                        onChange={(e) => setAnamnesiNote(e.target.value)}
                                        placeholder="Es: firmata in sede il..."
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAnamnesiOpen(false)}>
                                    Annulla
                                </Button>
                                <Button type="submit" className="brand-bg text-white" disabled={anamnesiUploading}>
                                    {anamnesiUploading ? "Caricamento..." : "Carica anamnesi"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog Modifica Profilo */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <form onSubmit={handleEdit}>
                            <DialogHeader>
                                <DialogTitle>Modifica Profilo</DialogTitle>
                                <DialogDescription>Aggiorna i dati anagrafici del cliente.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-nome">Nome</Label>
                                        <Input id="edit-nome" name="nome" defaultValue={client.nome} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-cognome">Cognome</Label>
                                        <Input id="edit-cognome" name="cognome" defaultValue={client.cognome} required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-email">Email</Label>
                                    <Input id="edit-email" name="email" type="email" defaultValue={client.email} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-nascita">Data di nascita</Label>
                                        <Input id="edit-nascita" name="data_di_nascita" type="date" defaultValue={client.data_di_nascita || ""} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-eta">Età</Label>
                                        <Input id="edit-eta" name="eta" type="number" placeholder="30" defaultValue={client.eta || ""} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-peso">Peso (kg)</Label>
                                        <Input id="edit-peso" name="peso" placeholder="75" defaultValue={client.peso || ""} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-altezza">Altezza (cm)</Label>
                                        <Input id="edit-altezza" name="altezza" placeholder="180" defaultValue={client.altezza || ""} />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Annulla</Button>
                                <Button type="submit" className="brand-bg text-white" disabled={saving}>
                                    {saving ? "Salvataggio..." : "Salva Modifiche"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog Nuovo Abbonamento */}
                <Dialog open={isSubOpen} onOpenChange={setIsSubOpen}>
                    <DialogContent className="sm:max-w-[400px]">
                        <form onSubmit={handleAddSub}>
                            <DialogHeader>
                                <DialogTitle>Nuovo Abbonamento</DialogTitle>
                                <DialogDescription>Assegna un servizio a {client.nome}.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Servizio</Label>
                                    <Select name="service_id" required>
                                        <SelectTrigger><SelectValue placeholder="Scegli un servizio..." /></SelectTrigger>
                                        <SelectContent>
                                            {services.map(s => (
                                                <SelectItem key={s.id} value={s.id.toString()}>
                                                    {s.nome_servizio} (€{(s.prezzo / 100).toFixed(2)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sub-data">Data Inizio</Label>
                                    <Input id="sub-data" name="data_inizio" type="date"
                                        defaultValue={new Date().toISOString().split('T')[0]} required />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="brand-bg text-white w-full">Attiva Abbonamento</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog Rinnovo Abbonamento */}
                <Dialog open={isRenewOpen} onOpenChange={(open) => { setIsRenewOpen(open); if (!open) setRenewTargetSub(null); }}>
                    <DialogContent className="sm:max-w-[400px]">
                        <form onSubmit={handleRenew}>
                            <DialogHeader>
                                <DialogTitle>Rinnova Abbonamento</DialogTitle>
                                <DialogDescription>
                                    Scade l'abbonamento corrente e ne crea uno nuovo.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Servizio</Label>
                                    <Select name="service_id" defaultValue={renewTargetSub?.service_id?.toString()} required>
                                        <SelectTrigger><SelectValue placeholder="Scegli un servizio..." /></SelectTrigger>
                                        <SelectContent>
                                            {services.map(s => (
                                                <SelectItem key={s.id} value={s.id.toString()}>
                                                    {s.nome_servizio} (€{(s.prezzo / 100).toFixed(2)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="renew-data">Data Inizio Nuovo Periodo</Label>
                                    <Input id="renew-data" name="data_inizio" type="date"
                                        defaultValue={new Date().toISOString().split('T')[0]} required />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsRenewOpen(false)}>Annulla</Button>
                                <Button type="submit" className="brand-bg text-white gap-2">
                                    <RefreshCw size={14} /> Rinnova
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog Assegna Scheda */}
                <Dialog open={isAssignWorkoutOpen} onOpenChange={setIsAssignWorkoutOpen}>
                    <DialogContent className="sm:max-w-[400px]">
                        <form onSubmit={handleAssignWorkout}>
                            <DialogHeader>
                                <DialogTitle>Assegna Scheda</DialogTitle>
                                <DialogDescription>Assegna un template esistente, oppure crea una scheda <Link href={`/workouts/builder?client=${client.id}`} className="text-blue-600 hover:underline">personalizzata</Link>.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Template Scheda</Label>
                                    <Select name="template_id" required>
                                        <SelectTrigger><SelectValue placeholder="Seleziona un template..." /></SelectTrigger>
                                        <SelectContent>
                                            {templates.map(t => (
                                                <SelectItem key={t.id} value={t.id.toString()}>
                                                    {t.nome_template}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAssignWorkoutOpen(false)}>Annulla</Button>
                                <Button type="submit" className="brand-bg text-white">Assegna</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

            </div>
        </TooltipProvider>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 flex items-center gap-1">
                <span className="text-slate-400">{icon}</span>
                {label}
            </span>
            <span className="text-sm font-medium text-slate-800">{value}</span>
        </div>
    );
}
