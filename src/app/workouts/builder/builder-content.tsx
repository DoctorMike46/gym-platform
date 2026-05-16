"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, Download, Trash2, GripVertical, Search, ArrowLeft, Dumbbell } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createWorkoutTemplate, updateWorkoutTemplate } from "@/lib/actions/workouts";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateWorkoutPDF } from "@/lib/pdf-generator";
import { getSettings } from "@/lib/actions/settings";

interface Exercise {
    id: number;
    nome: string;
    gruppo_muscolare: string | null;
}

interface WorkoutExercise {
    id: string; // unique local id
    exercise_id: number;
    giorno: number;
    ordine: number;
    nome: string;
    serie: string;
    ripetizioni: string;
    recupero: string;
    rpe: string;
    note_tecniche: string;
}

export default function BuilderContent({ availableExercises, initialTemplate }: { availableExercises: Exercise[], initialTemplate?: any }) {
    const router = useRouter();
    const [nomeTemplate, setNomeTemplate] = useState("");
    const [split, setSplit] = useState(3); // Default a 3 giorni
    const [noteProgressione, setNoteProgressione] = useState("Aumento ripetizioni: +1-2 rip finché arrivi al top range, poi aumenta il carico");
    const [activeTab, setActiveTab] = useState("1");

    const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [groupFilter, setGroupFilter] = useState<string>("all");
    const [isAddExOpen, setIsAddExOpen] = useState(false);

    // Effetto per pre-popolare i dati in Edit Mode
    useEffect(() => {
        if (initialTemplate) {
            setNomeTemplate(initialTemplate.nome_template || "");
            setSplit(initialTemplate.split_settimanale || 3);
            setNoteProgressione(initialTemplate.note_progressione || "");

            if (initialTemplate.exercises && Array.isArray(initialTemplate.exercises)) {
                const mappedEx: WorkoutExercise[] = initialTemplate.exercises.map((templateEx: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    exercise_id: templateEx.exercise_id,
                    giorno: templateEx.giorno,
                    ordine: templateEx.ordine,
                    nome: templateEx.exercise?.nome || "Esercizio rimosso",
                    serie: templateEx.serie || "",
                    ripetizioni: templateEx.ripetizioni || "",
                    recupero: templateEx.recupero || "",
                    rpe: templateEx.rpe || "",
                    note_tecniche: templateEx.note_tecniche || "",
                }));
                // Sort array to ensure order is respected
                mappedEx.sort((a, b) => {
                    if (a.giorno === b.giorno) return a.ordine - b.ordine;
                    return a.giorno - b.giorno;
                });

                setExercises(mappedEx);
            }
        }
    }, [initialTemplate]);

    const filteredExercises = availableExercises.filter(ex => {
        if (groupFilter !== "all" && ex.gruppo_muscolare !== groupFilter) {
            return false;
        }
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            ex.nome.toLowerCase().includes(q) ||
            (ex.gruppo_muscolare?.toLowerCase().includes(q) ?? false)
        );
    });

    const availableGroups = Array.from(
        new Set(
            availableExercises
                .map((ex) => ex.gruppo_muscolare)
                .filter((g): g is string => !!g),
        ),
    ).sort();

    const addExercise = (ex: Exercise) => {
        const currentGiorno = parseInt(activeTab);
        const dayExercises = exercises.filter(e => e.giorno === currentGiorno);

        const newEx: WorkoutExercise = {
            id: Math.random().toString(36).substr(2, 9),
            exercise_id: ex.id,
            giorno: currentGiorno,
            ordine: dayExercises.length,
            nome: ex.nome,
            serie: "3",
            ripetizioni: "10-12",
            recupero: "90s",
            rpe: "",
            note_tecniche: "",
        };
        setExercises([...exercises, newEx]);
        setIsAddExOpen(false);
        setSearchQuery("");
    };

    const removeExercise = (id: string, giorno: number) => {
        setExercises(prev => {
            const filtered = prev.filter(ex => ex.id !== id);
            // Re-order the remaining in that day
            const dayExs = filtered.filter(ex => ex.giorno === giorno).sort((a, b) => a.ordine - b.ordine);
            dayExs.forEach((ex, index) => { ex.ordine = index; });
            return [
                ...filtered.filter(ex => ex.giorno !== giorno),
                ...dayExs
            ];
        });
    };

    const updateExercise = (id: string, field: keyof WorkoutExercise, value: string) => {
        setExercises(exercises.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
    };

    const reorderDay = (giorno: number, fromId: string, toId: string) => {
        setExercises(prev => {
            const dayExs = [...prev.filter(ex => ex.giorno === giorno)].sort((a, b) => a.ordine - b.ordine);
            const fromIdx = dayExs.findIndex(ex => ex.id === fromId);
            const toIdx = dayExs.findIndex(ex => ex.id === toId);
            if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
            const reordered = arrayMove(dayExs, fromIdx, toIdx).map((ex, i) => ({
                ...ex,
                ordine: i,
            }));
            return [
                ...prev.filter(ex => ex.giorno !== giorno),
                ...reordered,
            ];
        });
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleSplitChange = (newSplit: number) => {
        if (newSplit < 1) newSplit = 1;
        setSplit(newSplit);
        if (parseInt(activeTab) > newSplit) {
            setActiveTab(newSplit.toString());
        }
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
                giorno: ex.giorno,
                ordine: ex.ordine,
                serie: ex.serie,
                ripetizioni: ex.ripetizioni,
                recupero: ex.recupero,
                rpe: ex.rpe,
                note_tecniche: ex.note_tecniche,
            }))
        };

        let result;
        if (initialTemplate?.id) {
            result = await updateWorkoutTemplate(initialTemplate.id, payload);
        } else {
            result = await createWorkoutTemplate(payload);
        }

        if (result.success) {
            toast.success(initialTemplate ? "Template aggiornato con successo!" : "Template salvato con successo!");
            router.push("/workouts");
        } else {
            toast.error("Errore nel salvataggio");
        }
    };

    const handleDownloadPDF = async () => {
        if (!nomeTemplate || exercises.length === 0) {
            toast.error("Salva o completa la scheda prima di esportare.");
            return;
        }
        try {
            toast.info("Generazione PDF in corso...");
            const settings = await getSettings();

            // Costruiamo un finto oggetto template formattato per il generatore PDF
            // simulando la struttura del DB.
            const currentTemplateObj = {
                id: initialTemplate?.id || Date.now(),
                nome_template: nomeTemplate,
                split_settimanale: split,
                note_progressione: noteProgressione,
                exercises: exercises.map(ex => ({
                    exercise_id: ex.exercise_id,
                    giorno: ex.giorno,
                    ordine: ex.ordine,
                    serie: ex.serie,
                    ripetizioni: ex.ripetizioni,
                    recupero: ex.recupero,
                    rpe: ex.rpe,
                    note_tecniche: ex.note_tecniche,
                    exercise: { nome: ex.nome }
                }))
            };

            await generateWorkoutPDF(currentTemplateObj, settings);
        } catch (error) {
            console.error(error);
            toast.error("Errore durante la generazione del PDF");
        }
    };

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-500 hover:text-slate-900 shrink-0"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft size={20} />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">Workout Builder</h1>
                        <p className="text-slate-500 mt-0.5 text-sm">Crea una nuova scheda di allenamento professionale.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:ml-auto">
                    <Button onClick={handleDownloadPDF} variant="outline" className="text-slate-700 border-slate-300 bg-white hover:bg-slate-50 gap-2 w-full sm:w-auto">
                        <Download size={16} /> Esporta PDF
                    </Button>
                    <Button onClick={handleSave} className="brand-bg text-white gap-2 w-full sm:w-auto">
                        <Save size={16} /> Salva Template
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sidebar Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-white border-slate-200 shadow-sm">
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
                                <Label htmlFor="split">Sessioni a settimana (Split)</Label>
                                <Input
                                    id="split"
                                    type="number"
                                    min="1"
                                    max="7"
                                    value={split}
                                    onChange={(e) => handleSplitChange(parseInt(e.target.value))}
                                />
                                <p className="text-xs text-slate-500 mt-1">Aggiungerà i relativi giorni nel builder.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm">
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

                {/* Builder Area con Tabs */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="bg-white border-slate-200 shadow-sm min-h-[500px]">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

                            <CardHeader className="border-b border-slate-100 bg-slate-50/30 pb-3">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex-1 overflow-x-auto no-scrollbar">
                                        <TabsList className="bg-slate-200/50">
                                            {Array.from({ length: split }).map((_, i) => (
                                                <TabsTrigger key={i + 1} value={(i + 1).toString()} className="data-[state=active]:brand-text data-[state=active]:font-semibold">
                                                    Giorno {i + 1}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                    </div>

                                    <Dialog open={isAddExOpen} onOpenChange={setIsAddExOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" className="brand-bg text-white ml-2 flex-shrink-0">
                                                <Plus size={16} className="mr-1.5" /> Esercizio
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Seleziona Esercizio (Giorno {activeTab})</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-3 pt-4">
                                                <div className="relative">
                                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                                    <Input
                                                        placeholder="Cerca per nome o gruppo muscolare..."
                                                        className="pl-8"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                    />
                                                </div>
                                                {availableGroups.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setGroupFilter("all")}
                                                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                                                groupFilter === "all"
                                                                    ? "brand-bg text-white"
                                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                            }`}
                                                        >
                                                            Tutti
                                                        </button>
                                                        {availableGroups.map((g) => (
                                                            <button
                                                                key={g}
                                                                type="button"
                                                                onClick={() => setGroupFilter(g)}
                                                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                                                    groupFilter === g
                                                                        ? "brand-bg text-white"
                                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                                }`}
                                                            >
                                                                {g}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="max-h-[300px] overflow-y-auto space-y-1">
                                                    {filteredExercises.map(ex => (
                                                        <button
                                                            key={ex.id}
                                                            onClick={() => addExercise(ex)}
                                                            className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 flex justify-between items-center group transition-colors"
                                                        >
                                                            <div>
                                                                <div className="font-medium text-slate-800">{ex.nome}</div>
                                                                <div className="text-xs text-slate-500">{ex.gruppo_muscolare}</div>
                                                            </div>
                                                            <Plus size={16} className="brand-text opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </button>
                                                    ))}
                                                    {filteredExercises.length === 0 && (
                                                        <p className="text-center text-slate-500 text-sm py-4">Nessun esercizio trovato.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                {Array.from({ length: split }).map((_, idx) => {
                                    const giorno = idx + 1;
                                    const dayExercises = exercises.filter(ex => ex.giorno === giorno).sort((a, b) => a.ordine - b.ordine);

                                    return (
                                        <TabsContent key={giorno} value={giorno.toString()} className="m-0 border-none outline-none">
                                            {dayExercises.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                                                    <Dumbbell size={32} className="opacity-20 mb-3" />
                                                    <p>Nessun esercizio nel Giorno {giorno}.</p>
                                                    <Button
                                                        variant="link"
                                                        className="brand-text mt-2 h-auto p-0"
                                                        onClick={() => setIsAddExOpen(true)}
                                                    >
                                                        Clicca qui per aggiungerne uno
                                                    </Button>
                                                </div>
                                            ) : (
                                                <DndContext
                                                    sensors={sensors}
                                                    collisionDetection={closestCenter}
                                                    onDragEnd={(event: DragEndEvent) => {
                                                        const { active, over } = event;
                                                        if (!over || active.id === over.id) return;
                                                        reorderDay(
                                                            giorno,
                                                            String(active.id),
                                                            String(over.id),
                                                        );
                                                    }}
                                                >
                                                    <SortableContext
                                                        items={dayExercises.map((ex) => ex.id)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        <div className="divide-y divide-slate-100">
                                                            {dayExercises.map((ex, index) => (
                                                                <SortableExerciseRow
                                                                    key={ex.id}
                                                                    ex={ex}
                                                                    index={index}
                                                                    onUpdate={updateExercise}
                                                                    onRemove={removeExercise}
                                                                />
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                </DndContext>
                                            )}
                                        </TabsContent>
                                    );
                                })}
                            </CardContent>

                        </Tabs>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function SortableExerciseRow({
    ex,
    index,
    onUpdate,
    onRemove,
}: {
    ex: WorkoutExercise;
    index: number;
    onUpdate: (id: string, field: keyof WorkoutExercise, value: string) => void;
    onRemove: (id: string, giorno: number) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: ex.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : "auto",
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`p-4 hover:bg-slate-50/50 group transition-colors ${
                isDragging ? "bg-slate-50" : ""
            }`}
        >
            <div className="flex gap-3 items-start">
                <button
                    type="button"
                    aria-label="Trascina per riordinare"
                    {...attributes}
                    {...listeners}
                    className="mt-1 h-8 w-6 flex items-center justify-center rounded-sm text-slate-300 hover:text-slate-600 hover:bg-slate-100 cursor-grab active:cursor-grabbing touch-none"
                >
                    <GripVertical size={16} />
                </button>

                <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="font-bold brand-text text-base">
                            {index + 1}. {ex.nome}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onRemove(ex.id, ex.giorno)}
                        >
                            <Trash2 size={16} />
                        </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 bg-white border border-slate-100 p-2 rounded-lg shadow-sm">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-slate-500 font-bold ml-1">
                                Serie
                            </Label>
                            <Input
                                className="h-8 text-sm font-medium"
                                placeholder="3 o 3-4"
                                value={ex.serie}
                                onChange={(e) =>
                                    onUpdate(ex.id, "serie", e.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-slate-500 font-bold ml-1">
                                Ripetizioni
                            </Label>
                            <Input
                                className="h-8 text-sm font-medium"
                                placeholder="10, 8-12, AMRAP"
                                value={ex.ripetizioni}
                                onChange={(e) =>
                                    onUpdate(ex.id, "ripetizioni", e.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-slate-500 font-bold ml-1">
                                Recupero
                            </Label>
                            <Input
                                className="h-8 text-sm font-medium"
                                placeholder="90s o 1-2 min"
                                value={ex.recupero}
                                onChange={(e) =>
                                    onUpdate(ex.id, "recupero", e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <Input
                        placeholder="Note tecniche opzionali (es: usa bilanciere ez, fermo al petto 1s, ecc...)"
                        className="h-8 text-xs italic bg-slate-50/70 border-dashed text-slate-600 placeholder:text-slate-400 focus:bg-white focus:border-solid"
                        value={ex.note_tecniche}
                        onChange={(e) =>
                            onUpdate(ex.id, "note_tecniche", e.target.value)
                        }
                    />
                </div>
            </div>
        </div>
    );
}
