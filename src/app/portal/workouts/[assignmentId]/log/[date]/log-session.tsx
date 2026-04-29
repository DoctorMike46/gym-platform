"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, Flag, Pause, Play } from "lucide-react";
import { saveExerciseLog, finishWorkoutSession } from "@/lib/actions/portal-workouts";
import { toast } from "sonner";

interface ExerciseInfo {
    templateExerciseId: number;
    ordine: number;
    name: string;
    gruppoMuscolare: string;
    serie: string;
    ripetizioni: string;
    recupero: string;
    rpe: string;
    note: string;
    videoUrl: string;
}

interface ExerciseLog {
    sets_completed: number;
    reps_actual: number[];
    weight_actual: number[];
    rpe_actual: (number | null)[];
    note: string;
}

const DEFAULT_LOG: ExerciseLog = {
    sets_completed: 0,
    reps_actual: [0],
    weight_actual: [0],
    rpe_actual: [null],
    note: "",
};

export default function LogSession({
    workoutLogId,
    assignmentId,
    day,
    date,
    templateName,
    exercises,
    initialLogs,
}: {
    workoutLogId: number;
    assignmentId: number;
    day: number;
    date: string;
    templateName: string;
    exercises: ExerciseInfo[];
    initialLogs: Record<number, ExerciseLog>;
}) {
    const router = useRouter();
    const [logs, setLogs] = useState<Record<number, ExerciseLog>>(() => {
        const initial: Record<number, ExerciseLog> = {};
        for (const ex of exercises) {
            initial[ex.templateExerciseId] = initialLogs[ex.templateExerciseId] || { ...DEFAULT_LOG, reps_actual: [0], weight_actual: [0], rpe_actual: [null] };
        }
        return initial;
    });
    const [finishing, setFinishing] = useState(false);

    // Stopwatch
    const STOPWATCH_KEY = `wlog:${workoutLogId}:start`;
    const [now, setNow] = useState(Date.now());
    const [paused, setPaused] = useState(false);
    const [accumulated, setAccumulated] = useState(0);
    const [startedAt, setStartedAt] = useState<number | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem(STOPWATCH_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as { startedAt: number | null; accumulated: number; paused: boolean };
            setStartedAt(parsed.startedAt);
            setAccumulated(parsed.accumulated);
            setPaused(parsed.paused);
        } else {
            setStartedAt(Date.now());
        }
    }, [workoutLogId]);

    useEffect(() => {
        localStorage.setItem(STOPWATCH_KEY, JSON.stringify({ startedAt, accumulated, paused }));
    }, [startedAt, accumulated, paused, STOPWATCH_KEY]);

    useEffect(() => {
        if (paused) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [paused]);

    const elapsedSeconds = startedAt && !paused
        ? accumulated + Math.floor((now - startedAt) / 1000)
        : accumulated;

    function formatTime(s: number) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }

    function togglePause() {
        if (paused) {
            setStartedAt(Date.now());
            setPaused(false);
        } else if (startedAt) {
            setAccumulated(accumulated + Math.floor((Date.now() - startedAt) / 1000));
            setStartedAt(null);
            setPaused(true);
        }
    }

    // Debounced auto-save
    const saveTimers = useRef<Record<number, NodeJS.Timeout>>({});
    function scheduleSave(exId: number, ordine: number) {
        if (saveTimers.current[exId]) clearTimeout(saveTimers.current[exId]);
        saveTimers.current[exId] = setTimeout(async () => {
            const log = logs[exId];
            if (!log) return;
            try {
                await saveExerciseLog({
                    workoutLogId,
                    templateExerciseId: exId,
                    ordine,
                    setsCompleted: log.sets_completed,
                    repsActual: log.reps_actual,
                    weightActual: log.weight_actual,
                    rpeActual: log.rpe_actual,
                    note: log.note || undefined,
                });
            } catch (e) {
                console.error("Save error:", e);
            }
        }, 500);
    }

    function updateLog(exId: number, ordine: number, updater: (prev: ExerciseLog) => ExerciseLog) {
        setLogs((prev) => {
            const next = { ...prev, [exId]: updater(prev[exId]) };
            return next;
        });
        scheduleSave(exId, ordine);
    }

    function addSet(exId: number, ordine: number) {
        updateLog(exId, ordine, (prev) => ({
            ...prev,
            reps_actual: [...prev.reps_actual, 0],
            weight_actual: [...prev.weight_actual, 0],
            rpe_actual: [...prev.rpe_actual, null],
        }));
    }

    function removeSet(exId: number, ordine: number, idx: number) {
        updateLog(exId, ordine, (prev) => {
            const reps = [...prev.reps_actual];
            const w = [...prev.weight_actual];
            const r = [...prev.rpe_actual];
            reps.splice(idx, 1);
            w.splice(idx, 1);
            r.splice(idx, 1);
            return {
                ...prev,
                reps_actual: reps.length ? reps : [0],
                weight_actual: w.length ? w : [0],
                rpe_actual: r.length ? r : [null],
                sets_completed: Math.min(prev.sets_completed, reps.length),
            };
        });
    }

    function setSetField(exId: number, ordine: number, idx: number, field: "reps" | "weight" | "rpe", value: number | null) {
        updateLog(exId, ordine, (prev) => {
            if (field === "reps") {
                const reps = [...prev.reps_actual];
                reps[idx] = (value as number) || 0;
                return { ...prev, reps_actual: reps };
            }
            if (field === "weight") {
                const w = [...prev.weight_actual];
                w[idx] = (value as number) || 0;
                return { ...prev, weight_actual: w };
            }
            const r = [...prev.rpe_actual];
            r[idx] = value;
            return { ...prev, rpe_actual: r };
        });
    }

    function toggleSetCompleted(exId: number, ordine: number, idx: number) {
        updateLog(exId, ordine, (prev) => ({
            ...prev,
            sets_completed: Math.max(prev.sets_completed, idx + 1),
        }));
    }

    async function finish() {
        setFinishing(true);
        try {
            // flush timers
            for (const t of Object.values(saveTimers.current)) clearTimeout(t);
            for (const ex of exercises) {
                const log = logs[ex.templateExerciseId];
                if (log) {
                    await saveExerciseLog({
                        workoutLogId,
                        templateExerciseId: ex.templateExerciseId,
                        ordine: ex.ordine,
                        setsCompleted: log.sets_completed,
                        repsActual: log.reps_actual,
                        weightActual: log.weight_actual,
                        rpeActual: log.rpe_actual,
                        note: log.note || undefined,
                    });
                }
            }
            await finishWorkoutSession(workoutLogId, elapsedSeconds);
            localStorage.removeItem(STOPWATCH_KEY);
            toast.success("Allenamento completato!");
            router.push(`/portal/workouts/${assignmentId}`);
            router.refresh();
        } catch (e) {
            console.error(e);
            toast.error("Errore durante la chiusura");
            setFinishing(false);
        }
    }

    return (
        <div className="space-y-5">
            <div className="sticky top-14 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-white/95 backdrop-blur border-b border-slate-200 z-30">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] text-slate-500 font-medium">{templateName} • Giorno {day}</p>
                        <p className="text-xs text-slate-400">{new Date(date).toLocaleDateString("it-IT")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={togglePause}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition"
                            aria-label={paused ? "Riprendi" : "Pausa"}
                        >
                            {paused ? <Play size={16} /> : <Pause size={16} />}
                        </button>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {formatTime(elapsedSeconds)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {exercises.map((ex) => {
                    const log = logs[ex.templateExerciseId];
                    if (!log) return null;
                    return (
                        <Card key={ex.templateExerciseId}>
                            <CardContent className="py-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900">{ex.name}</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {ex.gruppoMuscolare && <Badge variant="outline" className="text-[10px]">{ex.gruppoMuscolare}</Badge>}
                                            {ex.serie && <Badge variant="outline" className="text-[10px]">{ex.serie} serie</Badge>}
                                            {ex.ripetizioni && <Badge variant="outline" className="text-[10px]">{ex.ripetizioni} reps</Badge>}
                                            {ex.recupero && <Badge variant="outline" className="text-[10px]">Rec. {ex.recupero}</Badge>}
                                        </div>
                                    </div>
                                    {ex.videoUrl && (
                                        <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline shrink-0">
                                            Video
                                        </a>
                                    )}
                                </div>

                                {ex.note && <p className="text-xs text-slate-600 italic">{ex.note}</p>}

                                <div className="space-y-2">
                                    <div className="grid grid-cols-[24px_1fr_1fr_60px_36px_36px] gap-2 items-center text-[10px] uppercase font-semibold text-slate-400 px-1">
                                        <span>#</span>
                                        <span>Kg</span>
                                        <span>Reps</span>
                                        <span>RPE</span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    {log.reps_actual.map((_, idx) => {
                                        const completed = idx < log.sets_completed;
                                        return (
                                            <div key={idx} className="grid grid-cols-[24px_1fr_1fr_60px_36px_36px] gap-2 items-center">
                                                <span className="text-xs text-slate-500 font-medium">{idx + 1}</span>
                                                <Input
                                                    type="number"
                                                    inputMode="decimal"
                                                    value={log.weight_actual[idx] ?? ""}
                                                    onChange={(e) => setSetField(ex.templateExerciseId, ex.ordine, idx, "weight", parseFloat(e.target.value))}
                                                    className="h-9 text-sm"
                                                />
                                                <Input
                                                    type="number"
                                                    inputMode="numeric"
                                                    value={log.reps_actual[idx] ?? ""}
                                                    onChange={(e) => setSetField(ex.templateExerciseId, ex.ordine, idx, "reps", parseInt(e.target.value))}
                                                    className="h-9 text-sm"
                                                />
                                                <Input
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.5"
                                                    value={log.rpe_actual[idx] ?? ""}
                                                    onChange={(e) => setSetField(ex.templateExerciseId, ex.ordine, idx, "rpe", e.target.value === "" ? null : parseFloat(e.target.value))}
                                                    className="h-9 text-sm"
                                                    placeholder="-"
                                                />
                                                <button
                                                    onClick={() => toggleSetCompleted(ex.templateExerciseId, ex.ordine, idx)}
                                                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${completed ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                                                    aria-label="Segna completato"
                                                >
                                                    <Check size={14} />
                                                </button>
                                                <button
                                                    onClick={() => removeSet(ex.templateExerciseId, ex.ordine, idx)}
                                                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                                                    aria-label="Rimuovi set"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <Button variant="outline" size="sm" onClick={() => addSet(ex.templateExerciseId, ex.ordine)} className="w-full gap-2">
                                        <Plus size={14} /> Aggiungi set
                                    </Button>
                                </div>

                                <textarea
                                    placeholder="Note (opzionale)…"
                                    value={log.note}
                                    onChange={(e) => updateLog(ex.templateExerciseId, ex.ordine, (prev) => ({ ...prev, note: e.target.value }))}
                                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                                    rows={2}
                                />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Button onClick={finish} disabled={finishing} className="w-full h-12 gap-2" size="lg">
                <Flag size={16} /> {finishing ? "Salvataggio…" : "Termina allenamento"}
            </Button>
        </div>
    );
}
