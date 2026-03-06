"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Tooltip, TooltipContent,
    TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserPlus, CreditCard, Calendar, Eye, Pencil, Trash2, Search, FilterX } from "lucide-react";
import { createClient, deleteClient } from "@/lib/actions/clients";
import { createSubscription } from "@/lib/actions/subscriptions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function ClientPageContent({
    clientsData,
    servicesData
}: {
    clientsData: any[];
    servicesData: any[];
}) {
    const router = useRouter();
    const [isAddClientOpen, setIsAddClientOpen] = useState(false);
    const [isAddSubOpen, setIsAddSubOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterService, setFilterService] = useState("all");

    // Derived Filtered Data
    const filteredClients = clientsData.filter(client => {
        // Search Filter
        const searchMatch = !searchTerm ||
            client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.cognome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase());

        // Status Filter
        const activeSub = client.subscriptions?.find((s: any) => s.status === "attivo");
        let statusMatch = true;
        if (filterStatus === "active") statusMatch = !!activeSub;
        if (filterStatus === "inactive") statusMatch = !activeSub;

        // Service Filter
        let serviceMatch = true;
        if (filterService !== "all") {
            serviceMatch = activeSub?.service_id?.toString() === filterService;
        }

        return searchMatch && statusMatch && serviceMatch;
    });

    async function handleAddClient(formData: FormData) {
        await createClient(formData);
        setIsAddClientOpen(false);
        toast.success("Cliente aggiunto con successo!");
    }

    async function handleAddSubscription(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const serviceId = formData.get("service_id");
        const dataInizio = formData.get("data_inizio");

        if (!selectedClientId || !serviceId || !dataInizio) {
            toast.error("Compila tutti i campi");
            return;
        }

        const result = await createSubscription({
            client_id: selectedClientId,
            service_id: parseInt(serviceId as string),
            data_inizio: dataInizio as string,
        });

        if (result.success) {
            setIsAddSubOpen(false);
            toast.success("Abbonamento assegnato con successo!");
        } else {
            toast.error("Errore nell'assegnazione");
        }
    }

    async function handleDelete(id: number) {
        setDeletingId(id);
        const result = await deleteClient(id);
        setDeletingId(null);
        if (result.success) {
            toast.success("Cliente eliminato.");
        } else {
            toast.error("Errore durante l'eliminazione.");
        }
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Gestione Clienti</h1>
                        <p className="text-slate-500 mt-1">Anagrafica completa e stato degli abbonamenti attivi.</p>
                    </div>

                    <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
                        <DialogTrigger asChild>
                            <Button className="brand-bg text-white gap-2">
                                <UserPlus size={16} /> Nuovo Cliente
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <form action={handleAddClient}>
                                <DialogHeader>
                                    <DialogTitle>Aggiungi nuovo cliente</DialogTitle>
                                    <DialogDescription>Inserisci i dati base per creare il profilo del cliente.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="nome">Nome</Label>
                                            <Input id="nome" name="nome" placeholder="Mario" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cognome">Cognome</Label>
                                            <Input id="cognome" name="cognome" placeholder="Rossi" required />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" name="email" type="email" placeholder="mario.rossi@esempio.it" required />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="brand-bg text-white w-full">Salva Cliente</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cerca per nome, cognome o email..."
                            className="pl-9 border-slate-200 shadow-none h-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3">
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full md:w-[170px] border-slate-200 shadow-none h-10">
                                <SelectValue placeholder="Stato Abbonamento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tutti gli stati</SelectItem>
                                <SelectItem value="active">Attivo</SelectItem>
                                <SelectItem value="inactive">Nessun abbonamento</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filterService} onValueChange={setFilterService}>
                            <SelectTrigger className="w-full md:w-[200px] border-slate-200 shadow-none h-10">
                                <SelectValue placeholder="Tipo Servizio" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tutti i Servizi</SelectItem>
                                {servicesData.map(s => (
                                    <SelectItem key={s.id} value={s.id.toString()}>
                                        {s.nome_servizio}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {(searchTerm || filterStatus !== "all" || filterService !== "all") && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0"
                                        onClick={() => {
                                            setSearchTerm("");
                                            setFilterStatus("all");
                                            setFilterService("all");
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

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="hover:bg-slate-50 border-slate-200">
                                <TableHead className="text-slate-700 font-semibold">Cliente</TableHead>
                                <TableHead className="text-slate-700 font-semibold">Abbonamento</TableHead>
                                <TableHead className="text-center text-slate-700 font-semibold w-[120px]">Azioni</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredClients.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                                        {clientsData.length === 0
                                            ? "Nessun cliente registrato. Inizia aggiungendone uno."
                                            : "Nessun cliente trovato con i filtri attuali."}
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredClients.map((client) => {
                                const activeSub = client.subscriptions?.find((s: any) => s.status === "attivo");

                                return (
                                    <TableRow key={client.id} className="border-slate-200 hover:bg-slate-50/70 text-slate-800 group">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold brand-text">{client.nome} {client.cognome}</span>
                                                <span className="text-xs text-slate-400">{client.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {activeSub ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none">
                                                    {activeSub.service.nome_servizio}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-400 border-slate-200 shadow-none">
                                                    Nessun Abbonamento
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center gap-1">
                                                {/* Visualizza */}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                            onClick={() => router.push(`/clients/${client.id}`)}
                                                        >
                                                            <Eye size={15} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Visualizza profilo</TooltipContent>
                                                </Tooltip>

                                                {/* Abbonamento */}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                            onClick={() => {
                                                                setSelectedClientId(client.id);
                                                                setIsAddSubOpen(true);
                                                            }}
                                                        >
                                                            <CreditCard size={15} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Gestisci abbonamento</TooltipContent>
                                                </Tooltip>

                                                {/* Elimina */}
                                                <AlertDialog>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                                                    disabled={deletingId === client.id}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Elimina cliente</TooltipContent>
                                                    </Tooltip>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Elimina cliente</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Sei sicuro di voler eliminare <strong>{client.nome} {client.cognome}</strong>?
                                                                L'operazione è irreversibile e rimuoverà anche i suoi abbonamenti.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-rose-600 hover:bg-rose-700 text-white"
                                                                onClick={() => handleDelete(client.id)}
                                                            >
                                                                Elimina
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Dialog Abbonamento */}
                <Dialog open={isAddSubOpen} onOpenChange={setIsAddSubOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={handleAddSubscription}>
                            <DialogHeader>
                                <DialogTitle>Assegna Abbonamento</DialogTitle>
                                <DialogDescription>Seleziona un servizio dal listino per questo cliente.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Seleziona Servizio</Label>
                                    <Select name="service_id" required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Scegli un servizio..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {servicesData.map(s => (
                                                <SelectItem key={s.id} value={s.id.toString()}>
                                                    {s.nome_servizio} (€{(s.prezzo / 100).toFixed(2)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="data_inizio">Data Inizio</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="data_inizio"
                                            name="data_inizio"
                                            type="date"
                                            className="pl-9"
                                            defaultValue={new Date().toISOString().split('T')[0]}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="brand-bg text-white w-full">Attiva Abbonamento</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
