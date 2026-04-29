"use client";

import { useState, useMemo } from "react";
import { uploadDocument, deleteDocument, getDocumentDownloadUrl } from "@/lib/actions/documents";
import {
    FileText, Upload, Download, Trash2, X, Search, FilterX, File,
    User, Tag, FileCheck, Clock, ChevronRight, Folder, FolderOpen,
    Calendar as CalendarIcon, Image as ImageIcon, LayoutGrid, List,
    ArrowLeft, Notebook
} from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface DocumentItem {
    id: number;
    trainer_id: number;
    client_id: number;
    tipo_documento: string;
    nome_file: string;
    r2_key: string;
    mime_type: string | null;
    dimensione_bytes: number | null;
    note: string | null;
    created_at: Date;
    data_documento: string | null; // Added data_documento
    client: Client;
}

const TIPO_OPTIONS = [
    { value: "consenso", label: "Documenti", icon: <FileCheck className="w-4 h-4" /> },
    { value: "scheda", label: "Schede", icon: <File className="w-4 h-4" /> },
    { value: "foto_progresso", label: "Progressi", icon: <ImageIcon className="w-4 h-4" /> },
];

export default function DocumentsContent({
    documentsData,
    clientsData,
}: {
    documentsData: DocumentItem[];
    clientsData: Client[];
}) {
    // Navigation State
    const [view, setView] = useState<'clients' | 'folders' | 'files'>('clients');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

    const [showUpload, setShowUpload] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    // Upload form state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadClientId, setUploadClientId] = useState("");
    const [uploadTipoDocumento, setUploadTipoDocumento] = useState("consenso");
    const [note, setNote] = useState("");
    const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    function resetUpload() {
        setSelectedFile(null);
        setUploadClientId(selectedClient ? selectedClient.id.toString() : "");
        setUploadTipoDocumento(selectedFolder || "consenso");
        setNote("");
        setUploadDate(new Date().toISOString().split('T')[0]);
        setShowUpload(false);
    }

    function openUpload() {
        setUploadClientId(selectedClient?.id.toString() || "");
        setUploadTipoDocumento(selectedFolder || "consenso");
        setNote("");
        setUploadDate(new Date().toISOString().split('T')[0]);
        setShowUpload(true);
    }

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        const finalClientId = uploadClientId || selectedClient?.id.toString();
        if (!selectedFile || !finalClientId) {
            toast.error("Seleziona un file e un cliente");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("client_id", finalClientId);
            formData.append("tipo_documento", uploadTipoDocumento);
            formData.append("data_documento", uploadDate);
            if (note) formData.append("note", note);

            const result = await uploadDocument(formData);
            if (result.success) {
                toast.success("Documento caricato con successo!");
                resetUpload();
            } else {
                toast.error(result.error || "Errore durante l'upload");
            }
        } catch {
            toast.error("Errore imprevisto durante l'upload");
        }
        setLoading(false);
    }

    async function handleDownload(docId: number) {
        try {
            const result = await getDocumentDownloadUrl(docId);
            if (result.success && result.url) {
                window.open(result.url, "_blank");
            } else {
                toast.error(result.error || "Impossibile scaricare il documento");
            }
        } catch {
            toast.error("Errore durante il download");
        }
    }

    async function handleDelete() {
        if (!confirmDelete) return;
        const id = confirmDelete;
        setConfirmDelete(null);
        const result = await deleteDocument(id);
        if (result.success) toast.success("Documento eliminato");
        else toast.error(result.error || "Errore durante l'eliminazione");
    }

    function formatSize(bytes: number | null) {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    const filteredClients = useMemo(() => {
        return clientsData.filter(c =>
            `${c.nome} ${c.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [clientsData, searchTerm]);

    const filteredDocs = useMemo(() => {
        return documentsData.filter(doc => {
            const matchesSearch = doc.nome_file.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesClient = !selectedClient || doc.client_id === selectedClient.id;
            const matchesFolder = !selectedFolder || doc.tipo_documento === selectedFolder;
            return matchesSearch && matchesClient && matchesFolder;
        });
    }, [documentsData, searchTerm, selectedClient, selectedFolder]);

    const stats = useMemo(() => {
        const clientStats: Record<number, number> = {};
        documentsData.forEach(d => {
            clientStats[d.client_id] = (clientStats[d.client_id] || 0) + 1;
        });
        return clientStats;
    }, [documentsData]);

    const folderStats = useMemo(() => {
        if (!selectedClient) return { consenso: 0, scheda: 0, foto_progresso: 0 };
        const counts = { consenso: 0, scheda: 0, foto_progresso: 0 };
        documentsData.filter(d => d.client_id === selectedClient.id).forEach(d => {
            if (d.tipo_documento in counts) {
                counts[d.tipo_documento as keyof typeof counts]++;
            }
        });
        return counts;
    }, [documentsData, selectedClient]);

    return (
        <TooltipProvider>
            <div className="space-y-6 pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                            <button
                                onClick={() => { setView('clients'); setSelectedClient(null); setSelectedFolder(null); }}
                                className={`hover:text-brand-500 transition-colors ${view === 'clients' ? 'text-brand-600 font-semibold' : ''}`}
                            >
                                Clienti
                            </button>
                            {selectedClient && (
                                <>
                                    <ChevronRight size={14} />
                                    <button
                                        onClick={() => { setView('folders'); setSelectedFolder(null); }}
                                        className={`hover:text-brand-500 transition-colors ${view === 'folders' ? 'text-brand-600 font-semibold' : ''}`}
                                    >
                                        {selectedClient.nome} {selectedClient.cognome}
                                    </button>
                                </>
                            )}
                            {selectedFolder && (
                                <>
                                    <ChevronRight size={14} />
                                    <span className="text-brand-600 font-semibold">
                                        {TIPO_OPTIONS.find(o => o.value === selectedFolder)?.label}
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <FolderOpen className="w-7 h-7 sm:w-8 sm:h-8 brand-text shrink-0" />
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
                                    {selectedFolder ? TIPO_OPTIONS.find(o => o.value === selectedFolder)?.label : (selectedClient ? "Cartelle" : "Documenti")}
                                </h1>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                {selectedFolder === 'foto_progresso' && (
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <Button
                                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            onClick={() => setViewMode('grid')}
                                            className={`flex-1 h-8 px-3 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm hover:bg-white' : ''}`}
                                        >
                                            <LayoutGrid className="w-4 h-4 mr-2" />
                                            Grid
                                        </Button>
                                        <Button
                                            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            onClick={() => setViewMode('table')}
                                            className={`flex-1 h-8 px-3 rounded-lg ${viewMode === 'table' ? 'bg-white shadow-sm hover:bg-white' : ''}`}
                                        >
                                            <List className="w-4 h-4 mr-2" />
                                            Lista
                                        </Button>
                                    </div>
                                )}
                                <Button
                                    onClick={openUpload}
                                    className="brand-bg text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/20 px-6 h-11 rounded-2xl font-semibold gap-2 w-full sm:w-auto"
                                >
                                    <Upload className="w-5 h-5" />
                                    Carica File
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters/Search Bar */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder={view === 'clients' ? "Cerca cliente..." : "Cerca file..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-50 border-slate-200 rounded-xl focus:ring-brand-500"
                        />
                    </div>
                    {view !== 'clients' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500"
                            onClick={() => {
                                if (view === 'files') {
                                    setView('folders');
                                    setSelectedFolder(null);
                                } else {
                                    setView('clients');
                                    setSelectedClient(null);
                                }
                            }}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
                        </Button>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="min-h-[400px]">
                    {view === 'clients' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredClients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => { setSelectedClient(client); setView('folders'); }}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md transition-all text-left group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                                            <User size={24} />
                                        </div>
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none">
                                            {stats[client.id] || 0} file
                                        </Badge>
                                    </div>
                                    <h3 className="font-bold text-slate-900 truncate">
                                        {client.nome} {client.cognome}
                                    </h3>
                                    <p className="text-sm text-slate-400 truncate">{client.email}</p>
                                </button>
                            ))}
                            {filteredClients.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                                    <Search size={48} className="mb-4 opacity-20" />
                                    <p>Nessun cliente trovato</p>
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'folders' && selectedClient && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { id: 'consenso', label: 'Documenti', icon: <FileCheck className="w-8 h-8" />, desc: 'PDF consensi e anamnesi' },
                                { id: 'scheda', label: 'Schede', icon: <Notebook className="w-8 h-8" />, desc: 'Piani di allenamento assegnati' },
                                { id: 'foto_progresso', label: 'Progressi', icon: <ImageIcon className="w-8 h-8" />, desc: 'Foto e report trasformazione' },
                            ].map(folder => (
                                <button
                                    key={folder.id}
                                    onClick={() => { setSelectedFolder(folder.id); setView('files'); }}
                                    className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-lg transition-all text-center group"
                                >
                                    <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                                        {folder.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{folder.label}</h3>
                                    <p className="text-sm text-slate-500 mb-4">{folder.desc}</p>
                                    <Badge className="bg-slate-100 text-slate-600 border-none group-hover:bg-brand-100 group-hover:text-brand-700">
                                        {folderStats[folder.id as keyof typeof folderStats]} file presenti
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    )}

                    {view === 'files' && (
                        selectedClient && selectedFolder === 'foto_progresso' && viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {filteredDocs.length === 0 ? (
                                    <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                                        <ImageIcon className="w-12 h-12 mb-4 opacity-10" />
                                        <p className="text-lg font-medium text-slate-500">Nessuna foto trovata</p>
                                    </div>
                                ) : (
                                    filteredDocs.map((doc) => (
                                        <div key={doc.id} className="group relative bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                            <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden">
                                                {/* Preview Image if possible, else icon */}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <ImageIcon className="w-12 h-12 text-slate-300" />
                                                </div>
                                                {/* Action buttons overlay */}
                                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <Button
                                                        size="icon"
                                                        variant="secondary"
                                                        onClick={() => handleDownload(doc.id)}
                                                        className="w-10 h-10 rounded-full bg-white text-slate-900 hover:bg-brand-500 hover:text-white transition-colors"
                                                    >
                                                        <Download className="w-5 h-5" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="destructive"
                                                        onClick={() => setConfirmDelete(doc.id)}
                                                        className="w-10 h-10 rounded-full"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <CalendarIcon className="w-3.5 h-3.5 brand-text" />
                                                    <span className="text-sm font-bold text-slate-900" suppressHydrationWarning>
                                                        {new Date(doc.data_documento || doc.created_at).toLocaleDateString("it-IT", { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 truncate" title={doc.nome_file}>
                                                    {doc.nome_file}
                                                </p>
                                                {doc.note && (
                                                    <p className="text-[10px] text-slate-400 mt-2 italic line-clamp-2">
                                                        "{doc.note}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Table className="min-w-[640px]">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                                            <TableHead className="min-w-[260px] font-semibold text-slate-700">File</TableHead>
                                            <TableHead className="font-semibold text-slate-700">Dimensione</TableHead>
                                            <TableHead className="font-semibold text-slate-700">Data Documento</TableHead>
                                            <TableHead className="text-right font-semibold text-slate-700">Azioni</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDocs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-64 text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                                        <Folder className="w-12 h-12 mb-4 opacity-10" />
                                                        <p className="text-lg font-medium text-slate-500">Questa cartella è vuota</p>
                                                        <p className="text-sm">Inizia caricando un file per {selectedClient?.nome}.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredDocs.map((doc) => (
                                                <TableRow key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-white transition-colors">
                                                                {doc.tipo_documento === 'foto_progresso' ? <ImageIcon className="w-5 h-5 text-purple-500" /> : <File className="w-5 h-5 text-blue-500" />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-900 truncate max-w-[300px]" title={doc.nome_file}>
                                                                    {doc.nome_file}
                                                                </span>
                                                                {doc.note && (
                                                                    <span className="text-xs text-slate-400">
                                                                        {doc.note}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm text-slate-500 font-medium">
                                                            {formatSize(doc.dimensione_bytes)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-slate-500">
                                                            <CalendarIcon className="w-4 h-4 opacity-50" />
                                                            <span className="text-sm" suppressHydrationWarning>
                                                                {new Date(doc.data_documento || doc.created_at).toLocaleDateString("it-IT", { day: '2-digit', month: 'long', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDownload(doc.id)}
                                                                className="h-9 px-3 border-slate-200 hover:brand-border hover:brand-text gap-2 rounded-xl"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                                Scarica
                                                            </Button>

                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setConfirmDelete(doc.id)}
                                                                className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )
                    )}
                </div>

                {/* Upload Dialog */}
                <Dialog open={showUpload} onOpenChange={setShowUpload}>
                    <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                        <DialogHeader className="p-6 bg-slate-900 text-white relative h-32 flex flex-col justify-end">
                            <div className="absolute top-6 right-6">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowUpload(false)}
                                    className="text-white/50 hover:text-white hover:bg-white/10 rounded-full"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <Upload className="w-6 h-6" />
                                Carica Documento
                            </DialogTitle>
                            <DialogDescription className="text-white/60 mb-2">
                                Aggiungi un nuovo file nel cloud per il cliente.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-6 space-y-5 bg-white">
                            <form onSubmit={handleUpload} className="space-y-5">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 brand-text" />
                                                Cliente
                                            </label>
                                            <Select value={uploadClientId} onValueChange={setUploadClientId} required>
                                                <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-11">
                                                    <SelectValue placeholder="Seleziona..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {clientsData.map(c => (
                                                        <SelectItem key={c.id} value={c.id.toString()}>{c.nome} {c.cognome}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-1.5">
                                                <Tag className="w-3.5 h-3.5 brand-text" />
                                                Tipo
                                            </label>
                                            <Select value={uploadTipoDocumento} onValueChange={setUploadTipoDocumento} required>
                                                <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TIPO_OPTIONS.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5 brand-text" />
                                            File da caricare
                                        </label>
                                        <div
                                            className="relative border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-2xl p-8 text-center transition-all bg-slate-50 group cursor-pointer"
                                            onClick={() => document.getElementById("file-upload")?.click()}
                                        >
                                            <input
                                                id="file-upload"
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            />
                                            {selectedFile ? (
                                                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 text-brand-500">
                                                        <FileCheck className="w-6 h-6" />
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-900 block truncate max-w-[250px]">
                                                        {selectedFile.name}
                                                    </span>
                                                    <span className="text-xs text-slate-400 mt-1">
                                                        {formatSize(selectedFile.size)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400 group-hover:text-brand-500 transition-colors">
                                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-3">
                                                        <Upload className="w-6 h-6" />
                                                    </div>
                                                    <p className="text-sm font-medium">Clicca per selezionare un file</p>
                                                    <p className="text-xs mt-1">PDF, Immagini (Max 10MB)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-1.5">
                                                <CalendarIcon className="w-3.5 h-3.5 brand-text" />
                                                Data Documento
                                            </label>
                                            <Input
                                                type="date"
                                                value={uploadDate}
                                                onChange={(e) => setUploadDate(e.target.value)}
                                                className="bg-slate-50 border-slate-200 rounded-xl h-11"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 ml-1">
                                                Note (opzionale)
                                            </label>
                                            <Input
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                placeholder="Es. Foto prima..."
                                                className="bg-slate-50 border-slate-200 rounded-xl h-11"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        disabled={loading || !selectedFile || (!uploadClientId && !selectedClient)}
                                        className="flex-1 brand-bg text-white rounded-xl h-12 text-base font-semibold shadow-lg shadow-brand-500/20"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 animate-spin" />
                                                Caricamento in corso...
                                            </span>
                                        ) : "Conferma Caricamento"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={resetUpload}
                                        className="rounded-xl h-12 text-slate-500"
                                    >
                                        Annulla
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Confirm Delete Dialog */}
                <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                    <AlertDialogContent className="rounded-3xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Eliminare questo documento?</AlertDialogTitle>
                            <AlertDialogDescription>
                                L'azione è irreversibile. Il file verrà rimosso permanentemente sia dal database che dal cloud storage.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel className="rounded-xl border-slate-200">Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700">
                                Elimina Permanentemente
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </TooltipProvider>
    );
}
