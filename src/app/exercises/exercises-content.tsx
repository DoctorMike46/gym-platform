"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card, CardContent, CardDescription,
    CardHeader, CardTitle,
} from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Dumbbell, PlayCircle, Edit2, Trash2, Search, GripVertical } from "lucide-react";
import { createExercise, deleteExercise, updateExercise } from "@/lib/actions/exercises";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const GRUPPI_MUSCOLARI = [
    "Petto",
    "Dorso",
    "Spalle",
    "Gambe",
    "Bicipiti",
    "Tricipiti",
    "Addome",
    "Cardio",
    "Full Body",
    "Altro"
];

// Helper per gestire l'array dinamico nello State
export interface ExecutionStep {
    id: string;
    titolo: string;
    descrizione: string;
}

export default function ExercisesPageClient({ exercisesData }: { exercisesData: any[] }) {
    const router = useRouter();

    // Modals state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState<number | null>(null);

    // Form Steps State (Condiviso per evitare prop drilling eccessivo o form complessi in questo file singolo)
    const [currentSteps, setCurrentSteps] = useState<ExecutionStep[]>([]);

    // Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<string>("Tutti");

    // Computed filtered list
    const filteredExercises = exercisesData.filter(ex => {
        const matchesSearch = ex.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (ex.descrizione && ex.descrizione.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesFilter = activeFilter === "Tutti" || ex.gruppo_muscolare === activeFilter;
        return matchesSearch && matchesFilter;
    });

    // Opening Create Modal with 1 default step
    const openCreate = () => {
        setCurrentSteps([{ id: '1', titolo: '', descrizione: '' }]);
        setIsCreateOpen(true);
    };

    // Opening Edit Modal populating steps
    const openEdit = (ex: any) => {
        let parsedSteps: ExecutionStep[] = [];
        if (Array.isArray(ex.istruzioni_step_by_step)) {
            parsedSteps = ex.istruzioni_step_by_step;
        } else if (ex.istruzioni_step_by_step?.setup) {
            // Legacy data conversion
            if (ex.istruzioni_step_by_step.setup) parsedSteps.push({ id: 's1', titolo: 'Setup', descrizione: ex.istruzioni_step_by_step.setup });
            if (ex.istruzioni_step_by_step.esecuzione) parsedSteps.push({ id: 's2', titolo: 'Esecuzione', descrizione: ex.istruzioni_step_by_step.esecuzione });
            if (ex.istruzioni_step_by_step.focus) parsedSteps.push({ id: 's3', titolo: 'Focus', descrizione: ex.istruzioni_step_by_step.focus });
        }
        setCurrentSteps(parsedSteps);
        setIsEditOpen(ex.id);
    };

    async function handleAdd(formData: FormData) {
        // Appendi lo state dinamico al formData prima dell'invio
        formData.append("steps_json", JSON.stringify(currentSteps));

        const result = await createExercise(formData);
        setIsCreateOpen(false);
        if (result?.success === false) {
            toast.error("Errore durante l'aggiunta dell'esercizio.");
        } else {
            toast.success("Esercizio aggiunto con successo!");
            router.refresh();
        }
    }

    async function handleEdit(id: number, formData: FormData) {
        formData.append("steps_json", JSON.stringify(currentSteps));
        const result = await updateExercise(id, formData);
        setIsEditOpen(null);
        if (result.success) {
            toast.success("Esercizio modificato con successo!");
            router.refresh();
        } else {
            toast.error("Errore durante la modifica.");
        }
    }

    async function handleDelete(id: number) {
        const result = await deleteExercise(id);
        if (result.success) {
            toast.success("Esercizio eliminato.");
            router.refresh();
        } else {
            toast.error("Impossibile eliminare l'esercizio (potrebbe essere in uso).");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Catalogo Esercizi</h1>
                    <p className="text-slate-500 mt-1">Gestisci la libreria di esercizi per i tuoi workout.</p>
                </div>

                <Button className="brand-bg text-white gap-2" onClick={openCreate}>
                    <Plus size={16} /> Nuovo Esercizio
                </Button>
            </div>

            {/* Barre di filtri */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative w-full md:w-80 border-slate-200 shrink-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Cerca per nome..."
                        className="pl-9 bg-slate-50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap gap-2 w-full justify-start md:justify-end py-1">
                    <Button
                        variant={activeFilter === "Tutti" ? "default" : "outline"}
                        size="sm"
                        className={`rounded-full px-4 h-8 text-xs ${activeFilter === "Tutti" ? "brand-bg text-white" : "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100"}`}
                        onClick={() => setActiveFilter("Tutti")}
                    >
                        Tutti
                    </Button>
                    {GRUPPI_MUSCOLARI.map(gruppo => (
                        <Button
                            key={gruppo}
                            variant={activeFilter === gruppo ? "default" : "outline"}
                            size="sm"
                            className={`rounded-full px-4 h-8 text-xs whitespace-nowrap ${activeFilter === gruppo ? "brand-bg text-white" : "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100"}`}
                            onClick={() => setActiveFilter(gruppo)}
                        >
                            {gruppo}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Grid Exercises */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredExercises.length === 0 && (
                    <div className="col-span-full text-center py-16 text-slate-500 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center bg-slate-50">
                        <Dumbbell className="w-12 h-12 text-slate-300 mb-3" />
                        <h3 className="text-lg font-medium text-slate-700">Nessun esercizio trovato</h3>
                        <p className="text-sm mt-1">Prova a cambiare i filtri o aggiungi un nuovo esercizio.</p>
                    </div>
                )}

                {filteredExercises.map((ex) => {
                    // Check if new array format or old object format for display
                    let displaySteps: ExecutionStep[] = [];
                    if (Array.isArray(ex.istruzioni_step_by_step)) {
                        displaySteps = ex.istruzioni_step_by_step;
                    } else if (ex.istruzioni_step_by_step?.setup) {
                        if (ex.istruzioni_step_by_step.setup) displaySteps.push({ id: '1', titolo: 'Setup', descrizione: ex.istruzioni_step_by_step.setup });
                        if (ex.istruzioni_step_by_step.esecuzione) displaySteps.push({ id: '2', titolo: 'Move', descrizione: ex.istruzioni_step_by_step.esecuzione });
                        if (ex.istruzioni_step_by_step.focus) displaySteps.push({ id: '3', titolo: 'Focus', descrizione: ex.istruzioni_step_by_step.focus });
                    }

                    return (
                        <Card key={ex.id} className="bg-white shadow-sm border-slate-200 overflow-hidden hover:shadow-md transition-all group flex flex-col">
                            <div className="h-40 bg-slate-100 flex items-center justify-center border-b border-slate-200 relative">
                                {ex.video_url ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800/5 group-hover:bg-slate-800/10 transition-colors">
                                        <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-rose-600 hover:text-rose-700 hover:scale-110 transition-transform">
                                            <PlayCircle className="w-14 h-14 bg-white rounded-full p-0.5 shadow-sm" />
                                            <span className="text-[10px] font-bold mt-2 bg-white px-2 py-0.5 rounded-full shadow-sm text-slate-700">Guarda Video</span>
                                        </a>
                                    </div>
                                ) : (
                                    <Dumbbell className="w-12 h-12 text-slate-300" />
                                )}

                                {/* Azioni Card in Hover */}
                                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-7 w-7 bg-white/90 hover:bg-white text-slate-700 shadow-sm"
                                        onClick={() => openEdit(ex)}
                                    >
                                        <Edit2 size={13} />
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="icon" variant="destructive" className="h-7 w-7 shadow-sm">
                                                <Trash2 size={13} />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Elimina Esercizio</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Sei sicuro di voler eliminare l'esercizio <strong>{ex.nome}</strong>? Verrà rimosso anche dai template di scheda in cui è utilizzato (questa azione è irreversibile).
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-rose-600 hover:bg-rose-700 text-white"
                                                    onClick={() => handleDelete(ex.id)}
                                                >
                                                    Elimina
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>

                            <CardHeader className="pb-3 flex-1">
                                <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="text-lg brand-text leading-tight">{ex.nome}</CardTitle>
                                    {ex.gruppo_muscolare && (
                                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                            {ex.gruppo_muscolare}
                                        </span>
                                    )}
                                </div>
                                {ex.descrizione && (
                                    <CardDescription className="line-clamp-2 mt-1.5 text-xs">{ex.descrizione}</CardDescription>
                                )}
                            </CardHeader>

                            {displaySteps.length > 0 && (
                                <CardContent className="pt-0">
                                    <div className="text-xs text-slate-600 space-y-1.5 p-2.5 bg-slate-50/80 rounded-md border border-slate-100 max-h-[100px] overflow-hidden relative">
                                        {displaySteps.map((step, idx) => (
                                            <p key={idx} className="line-clamp-1"><span className="font-semibold text-slate-800">{step.titolo || `Step ${idx + 1}`}:</span> {step.descrizione}</p>
                                        ))}
                                        {displaySteps.length > 3 && (
                                            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-50 to-transparent"></div>
                                        )}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Dialog Create */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <form action={handleAdd}>
                        <DialogHeader>
                            <DialogTitle>Nuovo Esercizio</DialogTitle>
                            <DialogDescription>Aggiungi un nuovo esercizio al catalogo.</DialogDescription>
                        </DialogHeader>
                        <ExerciseFormFields
                            steps={currentSteps}
                            setSteps={setCurrentSteps}
                        />
                        <DialogFooter className="mt-6 border-t border-slate-100 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
                            <Button type="submit" className="brand-bg text-white">Salva Esercizio</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Edit */}
            {exercisesData.map(ex => (
                <Dialog key={`edit-${ex.id}`} open={isEditOpen === ex.id} onOpenChange={(open) => !open && setIsEditOpen(null)}>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                        <form action={(fd) => handleEdit(ex.id, fd)}>
                            <DialogHeader>
                                <DialogTitle>Modifica Esercizio</DialogTitle>
                            </DialogHeader>
                            <ExerciseFormFields
                                defaultValues={ex}
                                steps={currentSteps}
                                setSteps={setCurrentSteps}
                            />
                            <DialogFooter className="mt-6 border-t border-slate-100 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(null)}>Annulla</Button>
                                <Button type="submit" className="brand-bg text-white">Aggiorna Esercizio</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            ))}

        </div>
    );
}

// Estrazione Form
interface ExerciseFormFieldsProps {
    defaultValues?: any;
    steps: ExecutionStep[];
    setSteps: React.Dispatch<React.SetStateAction<ExecutionStep[]>>;
}

function ExerciseFormFields({ defaultValues, steps, setSteps }: ExerciseFormFieldsProps) {

    const addStep = () => {
        setSteps([...steps, { id: Math.random().toString(36).substr(2, 9), titolo: "", descrizione: "" }]);
    };

    const removeStep = (id: string) => {
        setSteps(steps.filter(s => s.id !== id));
    };

    const updateStep = (id: string, field: "titolo" | "descrizione", value: string) => {
        setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    return (
        <div className="grid gap-5 py-4 px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="nome">Nome Esercizio *</Label>
                    <Input id="nome" name="nome" placeholder="Es. Panca Piana" required defaultValue={defaultValues?.nome} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="gruppo_muscolare">Gruppo Muscolare</Label>
                    <Select name="gruppo_muscolare" defaultValue={defaultValues?.gruppo_muscolare || ""}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleziona..." />
                        </SelectTrigger>
                        <SelectContent>
                            {GRUPPI_MUSCOLARI.map(g => (
                                <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="video_url">URL Video Tutorial (Es. Youtube)</Label>
                <Input id="video_url" name="video_url" type="url" placeholder="https://youtube.com/..." defaultValue={defaultValues?.video_url} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="descrizione">Breve Descrizione</Label>
                <Textarea id="descrizione" name="descrizione" placeholder="Descrizione tecnica o appunti veloci..." defaultValue={defaultValues?.descrizione} />
            </div>

            <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-800">Fasi di Esecuzione</h4>
                        <p className="text-xs text-slate-500">Aggiungi step dinamici per spiegare il movimento.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addStep} className="h-8 gap-1.5 border-dashed border-slate-300 text-slate-600 hover:text-slate-900">
                        <Plus size={14} /> Aggiungi Step
                    </Button>
                </div>

                <div className="space-y-3">
                    {steps.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                            Nessuna fase aggiunta. Clicca su "Aggiungi Step".
                        </div>
                    )}
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex gap-3 items-start bg-slate-50 p-3 rounded-lg border border-slate-100 group relative">
                            <div className="mt-2 text-slate-300 cursor-move">
                                <GripVertical size={16} />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Step {index + 1}</Label>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeStep(step.id)}>
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                                <Input
                                    placeholder="Titolo fase (es: Setup, Posizione di partenza)"
                                    className="h-8 bg-white"
                                    value={step.titolo}
                                    onChange={(e) => updateStep(step.id, "titolo", e.target.value)}
                                />
                                <Textarea
                                    placeholder="Descrivi come eseguire questo step..."
                                    className="min-h-[60px] bg-white text-sm"
                                    value={step.descrizione}
                                    onChange={(e) => updateStep(step.id, "descrizione", e.target.value)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
