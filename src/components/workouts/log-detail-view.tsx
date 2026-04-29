import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell, Activity, MessageSquare, User } from "lucide-react";
import type { WorkoutLogDetail } from "@/lib/types/workout-log-detail";

interface LogDetailViewProps {
    data: WorkoutLogDetail;
    trainerNoteSlot?: React.ReactNode;
}

export function LogDetailView({ data, trainerNoteSlot }: LogDetailViewProps) {
    const { log, template, exerciseLogs } = data;

    const dateLabel = new Date(log.date_executed).toLocaleDateString("it-IT", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    const durationLabel = log.total_duration_seconds
        ? formatDuration(log.total_duration_seconds)
        : null;

    return (
        <div className="space-y-6">
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="py-4 sm:py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-base sm:text-lg font-bold text-slate-900 capitalize">{dateLabel}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                                {template && (
                                    <span className="inline-flex items-center gap-1">
                                        <Dumbbell size={12} />
                                        {template.nome_template}
                                    </span>
                                )}
                                {log.giorno != null && (
                                    <>
                                        <span>·</span>
                                        <span>Giorno {log.giorno}</span>
                                    </>
                                )}
                                {durationLabel && (
                                    <>
                                        <span>·</span>
                                        <span className="inline-flex items-center gap-1">
                                            <Clock size={12} />
                                            {durationLabel}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <StatusBadge status={log.status} />
                    </div>
                </CardContent>
            </Card>

            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-slate-500" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">Esercizi</h2>
                    <Badge variant="outline" className="text-xs">
                        {exerciseLogs.length}
                    </Badge>
                </div>

                {exerciseLogs.length === 0 ? (
                    <Card className="bg-white border-slate-200 border-dashed">
                        <CardContent className="py-10 text-center text-sm text-slate-500">
                            Nessun esercizio registrato in questa sessione.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {exerciseLogs.map((row) => (
                            <ExerciseLogCard key={row.exerciseLog.id} row={row} />
                        ))}
                    </div>
                )}
            </section>

            {log.note && (
                <Card className="bg-amber-50/40 border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-amber-900">
                            <User size={14} /> Nota del cliente
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <p className="text-sm text-amber-900 whitespace-pre-wrap">{log.note}</p>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-900">
                        <MessageSquare size={14} /> Nota del trainer
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    {trainerNoteSlot ?? <TrainerNoteReadOnly note={log.trainer_note} updatedAt={log.trainer_note_updated_at} />}
                </CardContent>
            </Card>
        </div>
    );
}

function ExerciseLogCard({
    row,
}: {
    row: WorkoutLogDetail["exerciseLogs"][number];
}) {
    const { exerciseLog, templateExercise, exercise } = row;
    const sets = Math.max(
        exerciseLog.sets_completed ?? 0,
        Array.isArray(exerciseLog.reps_actual) ? exerciseLog.reps_actual.length : 0,
        Array.isArray(exerciseLog.weight_actual) ? exerciseLog.weight_actual.length : 0,
        Array.isArray(exerciseLog.rpe_actual) ? exerciseLog.rpe_actual.length : 0,
    );

    const reps = (exerciseLog.reps_actual as (number | null)[] | null) ?? [];
    const weights = (exerciseLog.weight_actual as (number | null)[] | null) ?? [];
    const rpes = (exerciseLog.rpe_actual as (number | null)[] | null) ?? [];

    return (
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {exercise?.nome ?? "Esercizio rimosso"}
                        </CardTitle>
                        {exercise?.gruppo_muscolare && (
                            <p className="text-xs text-slate-500 mt-0.5">{exercise.gruppo_muscolare}</p>
                        )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                        {exerciseLog.sets_completed ?? 0} set
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="pt-3 space-y-3">
                {templateExercise && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1">Prescritto</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
                            {templateExercise.serie && <span><strong>Serie:</strong> {templateExercise.serie}</span>}
                            {templateExercise.ripetizioni && <span><strong>Reps:</strong> {templateExercise.ripetizioni}</span>}
                            {templateExercise.recupero && <span><strong>Recupero:</strong> {templateExercise.recupero}</span>}
                            {templateExercise.rpe && <span><strong>RPE:</strong> {templateExercise.rpe}</span>}
                        </div>
                        {templateExercise.note_tecniche && (
                            <p className="text-xs text-slate-500 italic mt-1">{templateExercise.note_tecniche}</p>
                        )}
                    </div>
                )}

                {sets === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nessun set completato.</p>
                ) : (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 overflow-hidden">
                        <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-bold px-3 pt-2">Eseguito</p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="text-slate-500">
                                    <tr className="border-b border-emerald-100/60">
                                        <th className="text-left font-semibold px-3 py-1.5 w-12">Set</th>
                                        <th className="text-left font-semibold px-3 py-1.5">Reps</th>
                                        <th className="text-left font-semibold px-3 py-1.5">Peso</th>
                                        <th className="text-left font-semibold px-3 py-1.5">RPE</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-800">
                                    {Array.from({ length: sets }).map((_, i) => (
                                        <tr key={i} className="border-b border-emerald-100/40 last:border-0">
                                            <td className="px-3 py-1.5 font-bold text-emerald-700">#{i + 1}</td>
                                            <td className="px-3 py-1.5">{formatCell(reps[i])}</td>
                                            <td className="px-3 py-1.5">{formatCell(weights[i], "kg")}</td>
                                            <td className="px-3 py-1.5">{formatCell(rpes[i])}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {exerciseLog.note && (
                    <p className="text-xs text-slate-600 italic border-l-2 border-slate-200 pl-2">
                        “{exerciseLog.note}”
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function TrainerNoteReadOnly({ note, updatedAt }: { note: string | null; updatedAt: Date | null }) {
    if (!note) {
        return <p className="text-sm text-slate-400 italic">Il trainer non ha ancora lasciato un commento.</p>;
    }
    return (
        <div className="space-y-2">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{note}</p>
            {updatedAt && (
                <p className="text-[10px] text-slate-400">
                    Aggiornata il {new Date(updatedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === "completed") {
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Completato</Badge>;
    }
    if (status === "in_progress") {
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">In corso</Badge>;
    }
    return <Badge variant="outline" className="text-slate-500">{status}</Badge>;
}

function formatDuration(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m === 0) return `${s}s`;
    if (s === 0) return `${m} min`;
    return `${m} min ${s}s`;
}

function formatCell(value: number | null | undefined, unit?: string) {
    if (value == null || (typeof value === "number" && isNaN(value))) return <span className="text-slate-300">—</span>;
    return unit ? `${value} ${unit}` : String(value);
}
