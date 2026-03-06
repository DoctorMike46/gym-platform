"use client";

import { useState } from "react";
import { createAnnouncement, updateAnnouncement, deleteAnnouncement, publishAnnouncement } from "@/lib/actions/announcements";
import { Megaphone, Plus, Send, Pencil, Trash2, X, Tag, Users, Mail, Eye, Search, FilterX } from "lucide-react";
import { toast } from "sonner";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface Client {
    id: number;
    nome: string;
    cognome: string;
    email: string;
}

interface Announcement {
    id: number;
    titolo: string;
    contenuto: string;
    tipo: string;
    destinatari: string;
    pubblicato: boolean;
    email_inviata: boolean;
    created_at: Date;
    recipients: { client: Client }[];
    image_r2_key: string | null;
    image_filename: string | null;
}

export default function AnnouncementsContent({
    announcementsData,
    clientsData,
}: {
    announcementsData: Announcement[];
    clientsData: Client[];
}) {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [viewing, setViewing] = useState<Announcement | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
    const [confirmPublish, setConfirmPublish] = useState<number | null>(null);

    // Filters state
    const [searchTerm, setSearchTerm] = useState("");
    const [filterTipo, setFilterTipo] = useState<string>("all");

    // Form state
    const [titolo, setTitolo] = useState("");
    const [contenuto, setContenuto] = useState("");
    const [tipo, setTipo] = useState("annuncio");
    const [destinatari, setDestinatari] = useState("tutti");
    const [selectedClients, setSelectedClients] = useState<number[]>([]);
    const [image, setImage] = useState<File | null>(null);
    const [removeImage, setRemoveImage] = useState(false);

    function resetForm() {
        setTitolo("");
        setContenuto("");
        setTipo("annuncio");
        setDestinatari("tutti");
        setSelectedClients([]);
        setImage(null);
        setRemoveImage(false);
        setEditing(null);
        setShowForm(false);
    }

    function openEdit(ann: Announcement) {
        setTitolo(ann.titolo);
        setContenuto(ann.contenuto);
        setTipo(ann.tipo);
        setDestinatari(ann.destinatari);
        setSelectedClients(ann.recipients.map(r => r.client.id));
        setEditing(ann);
        setRemoveImage(false);
        setImage(null);
        setShowForm(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("titolo", titolo);
            formData.append("contenuto", contenuto);
            formData.append("tipo", tipo);
            formData.append("destinatari", destinatari);

            if (destinatari === "selezionati") {
                formData.append("clientIds", JSON.stringify(selectedClients));
            }
            if (removeImage) {
                formData.append("removeImage", "true");
            } else if (image) {
                formData.append("image", image);
            }

            if (editing) {
                const result = await updateAnnouncement(editing.id, formData);
                if (result.success) toast.success("Annuncio aggiornato");
                else toast.error(result.error || "Errore");
            } else {
                const result = await createAnnouncement(formData);
                if (result.success) toast.success("Annuncio creato");
                else toast.error(result.error || "Errore");
            }
            resetForm();
        } catch { toast.error("Errore imprevisto"); }
        setLoading(false);
    }

    async function handleDelete() {
        if (!confirmDelete) return;
        const id = confirmDelete;
        setConfirmDelete(null);
        const result = await deleteAnnouncement(id);
        if (result.success) toast.success("Annuncio eliminato");
        else toast.error("Errore eliminazione");
    }

    async function handlePublish() {
        if (!confirmPublish) return;
        const id = confirmPublish;
        setConfirmPublish(null);
        setLoading(true);
        try {
            const result = await publishAnnouncement(id);
            if (result.success) {
                if (result.warning) {
                    toast.warning(result.warning);
                } else {
                    toast.success(result.message || "Annuncio pubblicato e email inviate!");
                }
            } else {
                toast.error(result.error || "Errore pubblicazione");
            }
        } catch {
            toast.error("Errore imprevisto durante la pubblicazione");
        }
        setLoading(false);
    }

    function toggleClient(clientId: number) {
        setSelectedClients(prev =>
            prev.includes(clientId)
                ? prev.filter(id => id !== clientId)
                : [...prev, clientId]
        );
    }

    const filteredAnnouncements = announcementsData.filter(ann => {
        const matchesSearch = ann.titolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ann.contenuto.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterTipo === "all" || ann.tipo === filterTipo;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Megaphone className="brand-text" size={32} />
                        Annunci & Offerte
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Crea e invia annunci o offerte ai tuoi clienti
                    </p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 brand-bg text-white rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
                >
                    <Plus size={18} />
                    <span className="font-medium">Nuovo Annuncio</span>
                </button>
            </div>

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={(open) => {
                if (!open) resetForm();
            }}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-slate-900">
                            {editing ? "Modifica Annuncio" : "Nuovo Annuncio"}
                        </DialogTitle>
                        <DialogDescription>
                            Compila i campi qui sotto per inviare una comunicazione ai tuoi clienti.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Titolo</label>
                            <Input
                                value={titolo}
                                onChange={e => setTitolo(e.target.value)}
                                required
                                className="bg-slate-50 border-slate-200"
                                placeholder="Titolo dell'annuncio"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contenuto</label>
                            <textarea
                                value={contenuto}
                                onChange={e => setContenuto(e.target.value)}
                                required
                                rows={5}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                                placeholder="Scrivi il contenuto dell'annuncio..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                                <select
                                    value={tipo}
                                    onChange={e => setTipo(e.target.value)}
                                    className="w-full px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value="annuncio">Annuncio</option>
                                    <option value="offerta">Offerta</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Destinatari</label>
                                <select
                                    value={destinatari}
                                    onChange={e => setDestinatari(e.target.value)}
                                    className="w-full px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value="tutti">Tutti i clienti</option>
                                    <option value="selezionati">Clienti selezionati</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Immagine (Opzionale)</label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setImage(file);
                                            setRemoveImage(false);
                                        } else {
                                            setImage(null);
                                        }
                                    }}
                                    className="bg-slate-50 border-slate-200 cursor-pointer flex-1"
                                />
                                {(image || (editing?.image_filename && !removeImage)) && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-slate-200"
                                        onClick={() => {
                                            setImage(null);
                                            setRemoveImage(true);
                                            // Reset file input
                                            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                                            if (fileInput) fileInput.value = '';
                                        }}
                                        title="Rimuovi immagine"
                                    >
                                        <X size={16} />
                                    </Button>
                                )}
                            </div>

                            {editing?.image_filename && !image && !removeImage && (
                                <p className="text-xs text-slate-500 mt-1">Immagine attuale: <span className="font-medium">{editing.image_filename}</span></p>
                            )}
                            {removeImage && editing?.image_filename && (
                                <p className="text-xs text-rose-500 mt-1">L'immagine verrà rimossa al salvataggio.</p>
                            )}
                        </div>

                        {/* Client selector */}
                        {destinatari === "selezionati" && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Seleziona Clienti ({selectedClients.length} selezionati)
                                </label>
                                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
                                    {clientsData.map(client => (
                                        <label
                                            key={client.id}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedClients.includes(client.id)
                                                ? "bg-blue-50 border border-blue-100"
                                                : "hover:bg-slate-100 border border-transparent"
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedClients.includes(client.id)}
                                                onChange={() => toggleClient(client.id)}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-900 font-medium">
                                                {client.nome} {client.cognome}
                                            </span>
                                            <span className="text-xs text-slate-500 ml-auto">{client.email}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                className="border-slate-200"
                            >
                                Annulla
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="brand-bg hover:opacity-90"
                            >
                                {loading ? "Salvataggio..." : editing ? "Salva Modifiche" : "Crea Annuncio"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null); }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
                            {viewing?.tipo === 'offerta' ? <Tag size={20} className="text-emerald-600" /> : <Megaphone size={20} className="brand-text" />}
                            {viewing?.titolo}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {viewing?.contenuto}
                        </div>
                        <div className="flex flex-col gap-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-slate-400" />
                                <span><strong className="text-slate-700">Destinatari:</strong> {viewing?.destinatari === 'tutti' ? 'Tutti i clienti' : `${viewing?.recipients.length} clienti selezionati`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail size={14} className="text-slate-400" />
                                <span><strong className="text-slate-700">Stato Email:</strong> {viewing?.email_inviata ? 'Inviata con successo' : 'Non ancora inviata (o non andata a buon fine)'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Send size={14} className="text-slate-400" />
                                <span><strong className="text-slate-700">Pubblicazione:</strong> {viewing?.pubblicato ? 'Pubblicato' : 'In Bozza'}</span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                        placeholder="Cerca per titolo o contenuto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10 border-slate-200 bg-white shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select value={filterTipo} onValueChange={setFilterTipo}>
                        <SelectTrigger className="w-[180px] h-10 bg-white border-slate-200 shadow-sm">
                            <SelectValue placeholder="Tutti i tipi" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tutti i tipi</SelectItem>
                            <SelectItem value="annuncio">Solo Annunci</SelectItem>
                            <SelectItem value="offerta">Solo Offerte</SelectItem>
                        </SelectContent>
                    </Select>

                    {(searchTerm || filterTipo !== "all") && (
                        <Button
                            variant="ghost"
                            onClick={() => { setSearchTerm(""); setFilterTipo("all"); }}
                            className="text-slate-500 hover:text-slate-700 h-10 px-3"
                        >
                            <FilterX size={18} />
                        </Button>
                    )}
                </div>
            </div>

            {/* List */}
            <TooltipProvider>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-6">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="hover:bg-slate-50 border-slate-200">
                                <TableHead className="text-slate-700 font-semibold w-[40%]">Titolo</TableHead>
                                <TableHead className="text-slate-700 font-semibold">Tipo</TableHead>
                                <TableHead className="text-slate-700 font-semibold">Stato</TableHead>
                                <TableHead className="text-slate-700 font-semibold">Data</TableHead>
                                <TableHead className="text-center text-slate-700 font-semibold w-[160px]">Azioni</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAnnouncements.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                        <Megaphone className="mx-auto text-slate-300 mb-4" size={48} />
                                        <p className="font-medium text-slate-500">Nessun risultato</p>
                                        <p className="text-sm text-slate-400 mt-1">Non ci sono annunci che corrispondono a questa ricerca</p>
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredAnnouncements.map(ann => (
                                <TableRow key={ann.id} className="border-slate-200 hover:bg-slate-50/70 text-slate-800 group">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900">{ann.titolo}</span>
                                            <span className="text-xs text-slate-400 line-clamp-1 mt-0.5" title={ann.contenuto}>
                                                {ann.contenuto}
                                            </span>
                                            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                                                <Users size={10} />
                                                <span>{ann.destinatari === "tutti" ? "Tutti i clienti" : `${ann.recipients.length} clienti selezionati`}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`shadow-none font-medium border ${ann.tipo === "offerta"
                                            ? "bg-green-50 text-green-700 border-green-200"
                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                            }`}>
                                            <Tag size={12} className="mr-1" />
                                            {ann.tipo === "offerta" ? "Offerta" : "Annuncio"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {ann.pubblicato ? (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-none justify-center w-fit">
                                                    Pubblicato
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 shadow-none justify-center w-fit">
                                                    Bozza
                                                </Badge>
                                            )}
                                            {ann.email_inviata && (
                                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 shadow-none justify-center w-fit">
                                                    <Mail size={10} className="mr-1" /> Invio ✔
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-slate-600">
                                            {new Date(ann.created_at).toLocaleDateString("it-IT", { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setViewing(ann)}
                                                        className="h-8 w-8 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                                                    >
                                                        <Eye size={15} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Visualizza dettagli</TooltipContent>
                                            </Tooltip>

                                            {!ann.pubblicato && (
                                                <>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setConfirmPublish(ann.id)}
                                                                disabled={loading}
                                                                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                            >
                                                                <Send size={15} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Pubblica e invia email</TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openEdit(ann)}
                                                                className="h-8 w-8 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                                                            >
                                                                <Pencil size={15} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Modifica annuncio</TooltipContent>
                                                    </Tooltip>
                                                </>
                                            )}

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setConfirmDelete(ann.id)}
                                                        className="h-8 w-8 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                    >
                                                        <Trash2 size={15} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Elimina annuncio</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TooltipProvider>

            {/* Confirm Delete Dialog */}
            <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminare questo annuncio?</AlertDialogTitle>
                        <AlertDialogDescription>
                            L'azione è irreversibile. L'annuncio verrà rimosso permanentemente dal sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl border-slate-200">Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700">
                            Elimina Annuncio
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Confirm Publish Dialog */}
            <AlertDialog open={confirmPublish !== null} onOpenChange={(open) => !open && setConfirmPublish(null)}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sei pronto a pubblicare?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Questo invierà immediatamente le email a tutti i destinatari selezionati. Assicurati che il contenuto sia corretto.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl border-slate-200">Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePublish} className="rounded-xl brand-bg hover:opacity-90">
                            Pubblica e Invia
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
