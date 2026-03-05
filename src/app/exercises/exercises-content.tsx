"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Dumbbell } from "lucide-react";
import { createExercise } from "@/lib/actions/exercises";
import { toast } from "sonner";

export default function ExercisesPageClient({ exercisesData }: { exercisesData: any[] }) {
    const [open, setOpen] = useState(false);

    async function handleAction(formData: FormData) {
        await createExercise(formData);
        setOpen(false);
        toast.success("Esercizio aggiunto con successo!");
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Catalogo Esercizi</h1>
                    <p className="text-slate-500 mt-1">Gestisci la libreria di esercizi per i tuoi workout.</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#003366] hover:bg-blue-900 text-white gap-2">
                            <Plus size={16} /> Aggiungi Esercizio
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <form action={handleAction}>
                            <DialogHeader>
                                <DialogTitle>Nuovo Esercizio</DialogTitle>
                                <DialogDescription>
                                    Inserisci le istruzioni divise in fasi (Setup, Esecuzione, Focus).
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                                <div className="space-y-2">
                                    <Label htmlFor="nome">Nome Esercizio</Label>
                                    <Input id="nome" name="nome" placeholder="Es. Panca Piana" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gruppo_muscolare">Gruppo Muscolare</Label>
                                    <Input id="gruppo_muscolare" name="gruppo_muscolare" placeholder="Es. Petto" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="descrizione">Breve Descrizione</Label>
                                    <Textarea id="descrizione" name="descrizione" placeholder="..." />
                                </div>

                                <div className="pt-4 border-t border-slate-200">
                                    <h4 className="text-sm font-semibold mb-3">Istruzioni a Fasi</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <Label htmlFor="setup" className="text-xs text-slate-500">Fase 1: Setup</Label>
                                            <Input id="setup" name="setup" placeholder="Es. Adduci le scapole" />
                                        </div>
                                        <div>
                                            <Label htmlFor="esecuzione" className="text-xs text-slate-500">Fase 2: Movimento</Label>
                                            <Input id="esecuzione" name="esecuzione" placeholder="Es. Scendi toccando il torace" />
                                        </div>
                                        <div>
                                            <Label htmlFor="focus" className="text-xs text-slate-500">Fase 3: Focus Point</Label>
                                            <Input id="focus" name="focus" placeholder="Es. Senti il petto allungarsi" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="bg-[#003366] text-white w-full">Salva Esercizio</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exercisesData.length === 0 && (
                    <div className="col-span-fulltext-center py-12 text-slate-500 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center bg-slate-50">
                        <Dumbbell className="w-12 h-12 text-slate-300 mb-2" />
                        <p>Nessun esercizio nel database.</p>
                    </div>
                )}

                {exercisesData.map((ex) => (
                    <Card key={ex.id} className="bg-white shadow-sm border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="h-32 bg-slate-100 flex items-center justify-center border-b border-slate-200">
                            {/* Placeholder for video thumbnail */}
                            <Dumbbell className="w-10 h-10 text-slate-300" />
                        </div>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg text-[#003366]">{ex.nome}</CardTitle>
                                {ex.gruppo_muscolare && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                        {ex.gruppo_muscolare}
                                    </span>
                                )}
                            </div>
                            <CardDescription className="line-clamp-2">{ex.descrizione}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {ex.istruzioni_step_by_step?.setup && (
                                <div className="text-xs text-slate-600 space-y-1 mt-2 p-2 bg-slate-50 rounded">
                                    <span className="font-semibold text-slate-900 block">Setup:</span>
                                    <p className="line-clamp-1">{ex.istruzioni_step_by_step.setup}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
