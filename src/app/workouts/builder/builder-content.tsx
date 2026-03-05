"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Save, Download, Trash2, GripVertical, Search } from "lucide-react";
import { createWorkoutTemplate } from "@/lib/actions/workouts";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Exercise {
    id: number;
    nome: string;
    gruppo_muscolare: string | null;
}

interface WorkoutExercise {
    id: string; // unique local id
    exercise_id: number;
    nome: string;
    serie: string;
    ripetizioni: string;
    recupero: string;
    rpe: string;
    note_tecniche: string;
}

export default function BuilderContent({ availableExercises }: { availableExercises: Exercise[] }) {
    const router = useRouter();
    const [nomeTemplate, setNomeTemplate] = useState("");
    const [split, setSplit] = useState(4);
    const [noteProgressione, setNoteProgressione] = useState("Aumento ripetizioni: +1-2 rip finché arrivi al top range, poi aumenta il carico");

    // Per ora gestiamo un singolo blocco di esercizi (Giorno 1) per semplicità, 
    // espandibile a più tab/giorni in seguito
    const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredExercises = availableExercises.filter(ex =>
        ex.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.gruppo_muscolare?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const addExercise = (ex: Exercise) => {
        const newEx: WorkoutExercise = {
            id: Math.random().toString(36).substr(2, 9),
            exercise_id: ex.id,
            nome: ex.nome,
            serie: "3",
            ripetizioni: "10",
            recupero: "90s",
            rpe: "8",
            note_tecniche: "",
        };
        setExercises([...exercises, newEx]);
    };

    const removeExercise = (id: string) => {
        setExercises(exercises.filter(ex => ex.id !== id));
    };

    const updateExercise = (id: string, field: keyof WorkoutExercise, value: string) => {
        setExercises(exercises.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
    };

    const handleSave = async () => {
        if (!nomeTemplate) {
            toast.error("Inserisci un nome per il template");
            return;
        }
        if (exercises.length === 0) {
            toast.error("Aggiungi almeno un esercizio");
            return;
        }

        const payload = {
            nome_template: nomeTemplate,
            split_settimanale: split,
            note_progressione: noteProgressione,
            exercises: exercises.map(ex => ({
                exercise_id: ex.exercise_id,
                serie: ex.serie,
                ripetizioni: ex.ripetizioni,
                recupero: ex.recupero,
                rpe: ex.rpe,
                note_tecniche: ex.note_tecniche,
            }))
        };

        const result = await createWorkoutTemplate(payload);
        if (result.success) {
            toast.success("Template salvato con successo!");
            router.push("/workouts");
        } else {
            toast.error("Errore nel salvataggio");
        }
    };

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Workout Builder</h1>
                    <p className="text-slate-500 mt-1">Crea una nuova scheda di allenamento professionale.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="text-slate-700 border-slate-300 bg-white hover:bg-slate-50 gap-2">
                        <Download size={16} /> Esporta PDF
                    </Button>
                    <Button onClick={handleSave} className="bg-[#003366] hover:bg-blue-900 text-white gap-2">
                        <Save size={16} /> Salva Template
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sidebar Info Scheda */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Dettagli Generali</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome Template / Scheda</Label>
                                <Input
                                    id="nome"
                                    value={nomeTemplate}
                                    onChange={(e) => setNomeTemplate(e.target.value)}
                                    placeholder="Es: Ipertrofia Base 4gg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="split">Sessioni a settimana</Label>
                                <Input
                                    id="split"
                                    type="number"
                                    value={split}
                                    onChange={(e) => setSplit(parseInt(e.target.value))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Regole Progressione</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                className="min-h-[100px]"
                                value={noteProgressione}
                                onChange={(e) => setNoteProgressione(e.target.value)}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Builder Area */}
                <div className="md:col-span-2 space-y-4">
                    <Card className="bg-white border-slate-200 text-slate-900 shadow-sm min-h-[500px]">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl text-[#003366]">Esercizi in Programma</CardTitle>

                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="bg-[#003366] text-white">
                                            <Plus size={16} className="mr-2" /> Aggiungi Esercizio
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Seleziona Esercizio</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 pt-4">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                                <Input
                                                    placeholder="Cerca esercizio..."
                                                    className="pl-8"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto space-y-1">
                                                {filteredExercises.map(ex => (
                                                    <button
                                                        key={ex.id}
                                                        onClick={() => addExercise(ex)}
                                                        className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 flex justify-between items-center group"
                                                    >
                                                        <div>
                                                            <div className="font-medium">{ex.nome}</div>
                                                            <div className="text-xs text-slate-500">{ex.gruppo_muscolare}</div>
                                                        </div>
                                                        <Plus size={14} className="text-[#003366] opacity-0 group-hover:opacity-100" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {exercises.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <p>Nessun esercizio aggiunto.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {exercises.map((ex, index) => (
                                        <div key={ex.id} className="p-4 hover:bg-slate-50/50 group transition-colors">
                                            <div className="flex gap-4 items-start">
                                                <div className="mt-2 text-slate-300">
                                                    <GripVertical size={20} />
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-[#003366]">{index + 1}. {ex.nome}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                            onClick={() => removeExercise(ex.id)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] uppercase text-slate-500 font-bold">Serie</Label>
                                                            <Input
                                                                size={1}
                                                                className="h-8 text-sm"
                                                                value={ex.serie}
                                                                onChange={(e) => updateExercise(ex.id, "serie", e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] uppercase text-slate-500 font-bold">Ripetizioni</Label>
                                                            <Input
                                                                className="h-8 text-sm"
                                                                value={ex.ripetizioni}
                                                                onChange={(e) => updateExercise(ex.id, "ripetizioni", e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] uppercase text-slate-500 font-bold">Recupero</Label>
                                                            <Input
                                                                className="h-8 text-sm"
                                                                value={ex.recupero}
                                                                onChange={(e) => updateExercise(ex.id, "recupero", e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] uppercase text-slate-500 font-bold">RPE</Label>
                                                            <Input
                                                                className="h-8 text-sm"
                                                                value={ex.rpe}
                                                                onChange={(e) => updateExercise(ex.id, "rpe", e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <Input
                                                        placeholder="Note tecniche (es: pancia a terra, gomiti larghi...)"
                                                        className="h-8 text-xs italic bg-slate-50/50 border-dashed"
                                                        value={ex.note_tecniche}
                                                        onChange={(e) => updateExercise(ex.id, "note_tecniche", e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
