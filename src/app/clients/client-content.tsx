"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, UserPlus, CreditCard, Calendar } from "lucide-react";
import { createClient } from "@/lib/actions/clients";
import { createSubscription } from "@/lib/actions/subscriptions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function ClientPageContent({
    clientsData,
    servicesData
}: {
    clientsData: any[],
    servicesData: any[]
}) {
    const [isAddClientOpen, setIsAddClientOpen] = useState(false);
    const [isAddSubOpen, setIsAddSubOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Gestione Clienti</h1>
                    <p className="text-slate-500 mt-1">Anagrafica completa e stato degli abbonamenti attivi.</p>
                </div>

                <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#003366] hover:bg-blue-900 text-white gap-2">
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
                                <Button type="submit" className="bg-[#003366] text-white w-full">Salva Cliente</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-slate-50 border-slate-200">
                            <TableHead className="text-slate-700 font-semibold">Cliente</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Stato Abbonamento</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Anamnesi</TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-6">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clientsData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                                    Nessun cliente registrato. Inizia aggiungendone uno.
                                </TableCell>
                            </TableRow>
                        )}
                        {clientsData.map((client) => {
                            const activeSub = client.subscriptions?.find((s: any) => s.status === "attivo");

                            return (
                                <TableRow key={client.id} className="border-slate-200 hover:bg-slate-50 text-slate-800">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-[#003366]">{client.nome} {client.cognome}</span>
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
                                        <Badge variant={client.anamnesi_status === "firmato" ? "default" : "secondary"}
                                            className={client.anamnesi_status === "firmato" ? "bg-blue-600" : "bg-slate-100 text-slate-600"}>
                                            {client.anamnesi_status === "firmato" ? "Firmato" : "Non Firmato"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 border-slate-200 text-slate-600 hover:text-[#003366] hover:bg-blue-50 gap-2"
                                            onClick={() => {
                                                setSelectedClientId(client.id);
                                                setIsAddSubOpen(true);
                                            }}
                                        >
                                            <CreditCard size={14} /> Abbonamento
                                        </Button>
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
                            <Button type="submit" className="bg-[#003366] text-white w-full">Attiva Abbonamento</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
