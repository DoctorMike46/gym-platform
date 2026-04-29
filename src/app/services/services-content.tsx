"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Tag, Edit2, Trash2, CheckCircle2, Download } from "lucide-react";
import { createService, updateService, deleteService } from "@/lib/actions/services";
import { getSettings } from "@/lib/actions/settings";
import { generateServicesPDF } from "@/lib/pdf-generator";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ServicesPageClient({ servicesData }: { servicesData: any[] }) {
    // Dialog state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    // Form state
    const [editingService, setEditingService] = useState<any>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const categorieDisponibili = ["Coaching Online", "Schede Preimpostate", "Consulenza Singola", "Personal Training", "Altro"];

    async function handleSave(formData: FormData) {
        if (editingService) {
            const res = await updateService(editingService.id, formData);
            if (res.success) toast.success("Servizio aggiornato!");
            else toast.error("Errore durante l'aggiornamento.");
        } else {
            const res = await createService(formData);
            if (res.success) toast.success("Servizio creato con successo!");
            else toast.error("Errore durante la creazione.");
        }
        setIsFormOpen(false);
        setEditingService(null);
    }

    async function handleDeleteConfirmed() {
        if (!deletingId) return;
        const res = await deleteService(deletingId);
        if (res.success) toast.success("Servizio eliminato.");
        else toast.error("Errore durante l'eliminazione.");
        setIsDeleteOpen(false);
        setDeletingId(null);
    }

    function openEdit(service: any) {
        setEditingService(service);
        setIsFormOpen(true);
    }

    function openCreate() {
        setEditingService(null);
        setIsFormOpen(true);
    }

    function confirmDelete(id: number) {
        setDeletingId(id);
        setIsDeleteOpen(true);
    }

    async function handleExportPDF() {
        if (servicesData.length === 0) {
            toast.error("Nessun servizio nel listino da esportare.");
            return;
        }
        try {
            toast.info("Generazione Listino in corso...");
            const settings = await getSettings();
            await generateServicesPDF(servicesData, settings);
        } catch (error) {
            console.error("Errore export services:", error);
            toast.error("Errore durante l'esportazione del listino.");
        }
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Servizi & Listino</h1>
                        <p className="text-slate-500 mt-1">Gestisci i pacchetti di allenamento e i piani in vendita.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <Button variant="outline" className="text-slate-700 bg-white hover:bg-slate-50 border-slate-200 w-full sm:w-auto" onClick={handleExportPDF}>
                            <Download size={16} className="mr-2" />
                            Esporta Listino
                        </Button>
                        <Button className="brand-bg text-white gap-2 shadow-sm w-full sm:w-auto" onClick={openCreate}>
                            <Plus size={16} /> Nuovo Servizio
                        </Button>
                    </div>
                </div>

                {/* Form Dialog */}
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <form action={handleSave}>
                            <DialogHeader>
                                <DialogTitle>{editingService ? "Modifica Servizio" : "Nuovo Servizio"}</DialogTitle>
                                <DialogDescription>
                                    Configura il listino e cosa comprende il pacchetto.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nome_servizio">Nome Pacchetto</Label>
                                        <Input id="nome_servizio" name="nome_servizio" defaultValue={editingService?.nome_servizio} placeholder="Es: Elite Coaching" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="categoria">Categoria</Label>
                                        <Select name="categoria" defaultValue={editingService?.categoria || "Coaching Online"}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleziona..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categorieDisponibili.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="prezzo">Prezzo (€)</Label>
                                        <Input id="prezzo" name="prezzo" type="number" step="0.01" defaultValue={editingService ? (editingService.prezzo / 100).toFixed(2) : ""} placeholder="99.00" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="durata_settimane">Durata (Settimane)</Label>
                                        <Input id="durata_settimane" name="durata_settimane" type="number" defaultValue={editingService?.durata_settimane || ""} placeholder="Es: 4 (lascia vuoto se singolo)" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="descrizione_breve">Sottotitolo / Descrizione Corta</Label>
                                    <Input id="descrizione_breve" name="descrizione_breve" defaultValue={editingService?.descrizione_breve || ""} placeholder="Ideale per intermedi o atleti avanzati..." />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="caratteristiche">Lista Caratteristiche (una per riga)</Label>
                                    <Textarea
                                        id="caratteristiche"
                                        name="caratteristiche"
                                        className="h-32"
                                        defaultValue={editingService?.caratteristiche || "Scheda 100% Personalizzata\nCheck settimanale video\nSupporto WhatsApp H24"}
                                        placeholder="Inserisci i bullet points del servizio..."
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Ogni riga diventerà un punto elenco nel PDF e nella card.</p>
                                </div>

                                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                                    <Checkbox id="include_coaching" name="include_coaching" defaultChecked={editingService?.include_coaching} />
                                    <Label htmlFor="include_coaching" className="text-sm font-medium leading-none cursor-pointer">
                                        Include affiancamento 1-to-1 (Coaching Attivo)
                                    </Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Annulla</Button>
                                <Button type="submit" className="brand-bg text-white">
                                    {editingService ? "Salva Modifiche" : "Crea Servizio"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Confirm Delete Dialog */}
                <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Questo disattiverà il pacchetto. I clienti che hanno attualmente questo abbonamento
                                continueranno ad averlo fino a scadenza, ma non potrà essere più assegnato a nuovi atleti.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDeleteConfirmed}>
                                Conferma Eliminazione
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Display Services (ordinati per prezzo crescente) */}
                {servicesData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 border-dashed rounded-xl shadow-sm">
                        <Tag className="h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-1">Nessun servizio nel listino</h3>
                        <p className="text-slate-500 mb-6 text-center max-w-md">Crea il tuo primo pacchetto o servizio per poterlo assegnare ai tuoi clienti.</p>
                        <Button className="brand-bg text-white shadow-sm" onClick={openCreate}>Inizia Ora</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                        {servicesData.map((service: any) => (
                            <Card key={service.id} className="relative bg-white shadow-sm hover:shadow-md transition-shadow border-slate-200 group flex flex-col">
                                <CardHeader className="pb-4 border-b border-slate-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg font-bold brand-text">{service.nome_servizio}</CardTitle>
                                            {service.descrizione_breve && (
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{service.descrizione_breve}</p>
                                            )}
                                        </div>
                                        <div className="bg-slate-50 text-slate-700 px-3 py-1 rounded-lg border border-slate-100 font-bold whitespace-nowrap">
                                            €{(service.prezzo / 100).toFixed(2)}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-4 flex-1">
                                    <div className="space-y-3">
                                        {service.durata_settimane && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                                                Durata: {service.durata_settimane} Settimane
                                            </Badge>
                                        )}
                                        {service.include_coaching && (
                                            <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                                                Coaching Incluso
                                            </Badge>
                                        )}

                                        {service.caratteristiche && (
                                            <ul className="mt-4 space-y-2">
                                                {service.caratteristiche.split('\n').map((feat: string, i: number) => {
                                                    if (!feat.trim()) return null;
                                                    return (
                                                        <li key={i} className="flex items-start text-sm text-slate-600">
                                                            <CheckCircle2 size={14} className="mr-2 mt-0.5 brand-text opacity-70 flex-shrink-0" />
                                                            <span className="leading-tight">{feat.trim()}</span>
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                </CardContent>

                                {/* Actions */}
                                <div className="absolute top-4 right-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-slate-100 flex items-center gap-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => openEdit(service)}>
                                                <Edit2 size={14} />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Modifica pacchetto</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => confirmDelete(service.id)}>
                                                <Trash2 size={14} />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Disattiva pacchetto</TooltipContent>
                                    </Tooltip>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}
