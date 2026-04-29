"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Dumbbell, FileText, Trash2, Eye, Download, Search, FilterX } from "lucide-react";
import { deleteWorkoutTemplate, getWorkoutTemplateWithExercises } from "@/lib/actions/workouts";
import { getSettings } from "@/lib/actions/settings";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { generateWorkoutPDF } from "@/lib/pdf-generator";

export default function WorkoutsContent({ templates }: { templates: any[] }) {
    const router = useRouter();

    // Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const [filterSplit, setFilterSplit] = useState("all");

    // Dynamic filtering
    const filteredTemplates = templates.filter(template => {
        const searchMatch = !searchTerm || template.nome_template.toLowerCase().includes(searchTerm.toLowerCase());
        const splitMatch = filterSplit === "all" || template.split_settimanale?.toString() === filterSplit;
        return searchMatch && splitMatch;
    });

    async function handleDelete(id: number) {
        const result = await deleteWorkoutTemplate(id);
        if (result.success) {
            toast.success("Scheda eliminata con successo");
            router.refresh();
        } else {
            toast.error("Errore durante l'eliminazione della scheda");
        }
    }

    async function handleDownloadPDF(id: number, e: React.MouseEvent) {
        e.preventDefault();
        try {
            toast.info("Generazione PDF in corso...");
            const [fullTemplate, settings] = await Promise.all([
                getWorkoutTemplateWithExercises(id),
                getSettings()
            ]);

            if (!fullTemplate) {
                toast.error("Impossibile recuperare i dati della scheda");
                return;
            }

            await generateWorkoutPDF(fullTemplate, settings);
        } catch (error) {
            console.error(error);
            toast.error("Errore durante la generazione del PDF");
        }
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Programmi di Allenamento</h1>
                        <p className="text-slate-500 mt-1">Gestisci i tuoi template e assegnali ai tuoi atleti.</p>
                    </div>
                    <Link href="/workouts/builder" className="w-full sm:w-auto">
                        <Button className="brand-bg text-white gap-2 w-full sm:w-auto">
                            <Plus size={16} /> Crea Nuovo Programma
                        </Button>
                    </Link>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cerca per nome del programma..."
                            className="pl-9 border-slate-200 shadow-none h-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3">
                        <Select value={filterSplit} onValueChange={setFilterSplit}>
                            <SelectTrigger className="w-full md:w-[170px] border-slate-200 shadow-none h-10">
                                <SelectValue placeholder="Frequenza" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Qualsiasi Split</SelectItem>
                                <SelectItem value="2">2 Sedute</SelectItem>
                                <SelectItem value="3">3 Sedute</SelectItem>
                                <SelectItem value="4">4 Sedute</SelectItem>
                                <SelectItem value="5">5 Sedute</SelectItem>
                                <SelectItem value="6">6 Sedute</SelectItem>
                                <SelectItem value="7">7 Sedute</SelectItem>
                            </SelectContent>
                        </Select>

                        {(searchTerm || filterSplit !== "all") && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0"
                                        onClick={() => {
                                            setSearchTerm("");
                                            setFilterSplit("all");
                                        }}
                                    >
                                        <FilterX size={18} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Resetta filtri</TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="hover:bg-slate-50 border-slate-200">
                                <TableHead className="text-slate-700 font-semibold min-w-[200px]">Nome Programma</TableHead>
                                <TableHead className="text-slate-700 font-semibold">Split</TableHead>
                                <TableHead className="text-slate-700 font-semibold">Data Creazione</TableHead>
                                <TableHead className="text-right text-slate-700 font-semibold">Azioni</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTemplates.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Dumbbell className="h-8 w-8 opacity-20" />
                                            <p>{templates.length === 0
                                                ? "Nessun programma salvato. Inizia creandone uno nuovo."
                                                : "Nessun programma trovato con i filtri attuali."}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {filteredTemplates.map((template) => (
                                <TableRow key={template.id} className="border-slate-200 hover:bg-slate-50 text-slate-800 group">
                                    <TableCell className="font-semibold brand-text">
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-slate-400" />
                                            {template.nome_template}
                                        </div>
                                    </TableCell>
                                    <TableCell>{template.split_settimanale} Sessioni</TableCell>
                                    <TableCell className="text-slate-500">
                                        {new Date(template.created_at).toLocaleDateString('it-IT')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Visualizza (stub for edit) */}
                                            <Link href={`/workouts/builder?edit=${template.id}`}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Eye size={16} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Visualizza/Modifica</TooltipContent>
                                                </Tooltip>
                                            </Link>

                                            {/* Scarica PDF */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                        onClick={(e) => handleDownloadPDF(template.id, e)}
                                                    >
                                                        <Download size={16} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Esporta PDF</TooltipContent>
                                            </Tooltip>

                                            {/* Elimina */}
                                            <AlertDialog>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Elimina Scheda</TooltipContent>
                                                </Tooltip>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Questa azione è irreversibile. Eliminerai definitivamente il template <strong>{template.nome_template}</strong>. I clienti con questa scheda assegenata la perderanno se non l&apos;hanno già salvata (dipende dalla politica di assegnazione, al momento elimina anche i record correlati).
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-rose-600 hover:bg-rose-700 text-white"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleDelete(template.id);
                                                            }}
                                                        >
                                                            Elimina
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </TooltipProvider>
    );
}
