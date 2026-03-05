"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Tag } from "lucide-react";
import { createService } from "@/lib/actions/services";
import { toast } from "sonner";

export default function ServicesPageClient({ servicesData }: { servicesData: any[] }) {
    const [open, setOpen] = useState(false);

    async function handleAction(formData: FormData) {
        await createService(formData);
        setOpen(false);
        toast.success("Servizio aggiunto con successo!");
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Servizi & Abbonamenti</h1>
                    <p className="text-slate-500 mt-1">Configura i pacchetti e il listino prezzi per i tuoi atleti.</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#003366] hover:bg-blue-900 text-white gap-2">
                            <Plus size={16} /> Nuovo Servizio
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <form action={handleAction}>
                            <DialogHeader>
                                <DialogTitle>Nuovo Servizio</DialogTitle>
                                <DialogDescription>
                                    Crea un nuovo pacchetto o servizio per il tuo listino.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nome_servizio">Nome Servizio</Label>
                                    <Input id="nome_servizio" name="nome_servizio" placeholder="Es: Coaching Online Elite" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="prezzo">Prezzo (€)</Label>
                                        <Input id="prezzo" name="prezzo" type="number" step="0.01" placeholder="49.99" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="durata_settimane">Durata (Sett.)</Label>
                                        <Input id="durata_settimane" name="durata_settimane" type="number" placeholder="4" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="descrizione_breve">Descrizione Breve</Label>
                                    <Textarea id="descrizione_breve" name="descrizione_breve" placeholder="Breve elenco di cosa include..." />
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox id="include_coaching" name="include_coaching" />
                                    <Label htmlFor="include_coaching" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Include coaching 1-to-1
                                    </Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="bg-[#003366] text-white w-full">Salva Servizio</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-slate-50 border-slate-200">
                            <TableHead className="text-slate-700 font-semibold w-[300px]">Nome Servizio</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Descrizione</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Durata</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Prezzo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {servicesData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Tag className="h-8 w-8 opacity-20" />
                                        <p>Nessun servizio nel listino al momento.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            servicesData.map((service) => (
                                <TableRow key={service.id} className="border-slate-200 hover:bg-slate-50 text-slate-800">
                                    <TableCell className="font-semibold text-[#003366]">{service.nome_servizio}</TableCell>
                                    <TableCell className="text-slate-500 text-sm max-w-[400px] truncate">{service.descrizione_breve || "-"}</TableCell>
                                    <TableCell className="text-slate-700">
                                        {service.durata_settimane ? `${service.durata_settimane} Settimane` : 'Singolo'}
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-900">€{(service.prezzo / 100).toFixed(2)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
