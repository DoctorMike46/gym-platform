"use client";

import { useState } from "react";
import {
    Plus,
    Trash2,
    UserPlus,
    Mail,
    Shield,
    Calendar,
    Search,
    UserCheck,
    MoreVertical
} from "lucide-react";
import {
    createTrainer,
    deleteTrainer
} from "@/lib/actions/admin-trainers";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Trainer {
    id: number;
    nome: string | null;
    email: string;
    role: string;
    created_at: Date;
}

export default function AdminDashboardContent({
    initialTrainers,
    primaryColor
}: {
    initialTrainers: any[],
    primaryColor: string
}) {
    const [trainers, setTrainers] = useState<Trainer[]>(initialTrainers);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Filtered trainers
    const filteredTrainers = trainers.filter(t =>
        t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.nome || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    async function handleCreateTrainer(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const fd = new FormData(e.currentTarget);
        const data = {
            nome: fd.get("nome") as string,
            email: fd.get("email") as string,
            password: fd.get("password") as string,
            role: fd.get("role") as string,
        };

        try {
            const result = await createTrainer(data);
            if (result.success) {
                toast.success("Trainer creato con successo");
                setIsCreateOpen(false);
                // In a real app we'd refresh or update state. 
                // For simplicity here, let's suggest a refresh or re-fetch
                window.location.reload();
            } else {
                toast.error(result.error || "Errore durante la creazione");
            }
        } catch {
            toast.error("Errore di rete");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm("Sei sicuro di voler eliminare questo trainer? Tutte le sue schede e i suoi clienti verranno eliminati.")) return;

        const result = await deleteTrainer(id);
        if (result.success) {
            setTrainers(trainers.filter(t => t.id !== id));
            toast.success("Trainer eliminato");
        } else {
            toast.error(result.error);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                        placeholder="Cerca per nome o email..."
                        className="pl-10 h-11 bg-white border-slate-200 rounded-xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="h-11 rounded-xl px-6 gap-2 shadow-lg shadow-brand-500/20"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <UserPlus size={18} />
                            Nuovo Trainer
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-2xl">
                        <DialogHeader>
                            <DialogTitle>Aggiungi Nuovo Trainer</DialogTitle>
                            <DialogDescription>
                                Crea un nuovo account per un trainer sulla piattaforma.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateTrainer} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome Completo</Label>
                                <Input id="nome" name="nome" placeholder="es. Mario Rossi" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" placeholder="mario@esempio.com" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password Temporanea</Label>
                                <Input id="password" name="password" type="password" placeholder="••••••••" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Ruolo</Label>
                                <select
                                    id="role"
                                    name="role"
                                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                                    defaultValue="trainer"
                                >
                                    <option value="trainer">Trainer Standard</option>
                                    <option value="admin">Amministratore</option>
                                </select>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-11 rounded-xl"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {isLoading ? "Creazione in corso..." : "Crea Account Trainer"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTrainers.map((trainer) => (
                    <Card key={trainer.id} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden rounded-2xl group">
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                                    <UserCheck size={24} />
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                            <MoreVertical size={16} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl">
                                        <DropdownMenuItem
                                            className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                                            onClick={() => handleDelete(trainer.id)}
                                        >
                                            <Trash2 size={16} className="mr-2" />
                                            Elimina Trainer
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="mt-4">
                                <CardTitle className="text-lg font-bold text-slate-900 leading-tight">
                                    {trainer.nome || "Senza Nome"}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1.5 mt-1">
                                    <Mail size={12} />
                                    {trainer.email}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 pb-6">
                            <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-2">
                                    <Shield size={14} className={trainer.role === 'admin' ? "text-amber-500" : "text-slate-400"} />
                                    <Badge variant={trainer.role === 'admin' ? "default" : "secondary"} className="capitalize">
                                        {trainer.role}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400" suppressHydrationWarning>
                                    <Calendar size={12} />
                                    {new Date(trainer.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredTrainers.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <UserCheck size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Nessun trainer trovato</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">
                            Non ci sono trainer che corrispondono alla tua ricerca.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
