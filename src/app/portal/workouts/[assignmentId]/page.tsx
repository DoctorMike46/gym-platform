import { notFound } from "next/navigation";
import Link from "next/link";
import { requireClientAuth } from "@/lib/client-auth";
import { getClientWorkoutDetail, getWorkoutLogHistory } from "@/lib/actions/portal-workouts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WorkoutDetailPage({
    params,
}: {
    params: Promise<{ assignmentId: string }>;
}) {
    await requireClientAuth();
    const { assignmentId } = await params;
    const id = parseInt(assignmentId);
    if (isNaN(id)) notFound();

    const detail = await getClientWorkoutDetail(id).catch(() => null);
    if (!detail) notFound();

    const history = await getWorkoutLogHistory(id);
    const today = new Date().toISOString().slice(0, 10);

    const days = new Map<number, typeof detail.exercises>();
    for (const ex of detail.exercises) {
        const g = ex.te.giorno || 1;
        const arr = days.get(g) || [];
        arr.push(ex);
        days.set(g, arr);
    }

    return (
        <div className="space-y-6">
            <Link href="/portal/workouts" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                <ArrowLeft size={16} /> Torna agli allenamenti
            </Link>

            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">{detail.template.nome_template}</h1>
                <p className="text-slate-500 text-sm mt-1">{detail.template.split_settimanale}× a settimana</p>
            </div>

            {detail.template.note_progressione && (
                <Card>
                    <CardContent className="py-4">
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Progressione</p>
                        <p className="text-sm text-slate-700">{detail.template.note_progressione}</p>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-6">
                {Array.from(days.entries()).sort(([a], [b]) => a - b).map(([day, exs]) => (
                    <div key={day}>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-slate-900">Giorno {day}</h2>
                            <Link
                                href={`/portal/workouts/${id}/log/${today}?giorno=${day}`}
                                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-white text-xs font-semibold bg-slate-900 hover:bg-slate-800 transition"
                            >
                                <Play size={14} /> Inizia
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {exs.map((e) => (
                                <Card key={e.te.id}>
                                    <CardContent className="py-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-slate-900">{e.ex?.nome}</p>
                                                {e.ex?.gruppo_muscolare && (
                                                    <Badge variant="outline" className="mt-1 text-[10px]">
                                                        {e.ex.gruppo_muscolare}
                                                    </Badge>
                                                )}
                                                <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2">
                                                    {e.te.serie && <span>{e.te.serie} serie</span>}
                                                    {e.te.ripetizioni && <span>• {e.te.ripetizioni} reps</span>}
                                                    {e.te.recupero && <span>• {e.te.recupero} rec.</span>}
                                                    {e.te.rpe && <span>• RPE {e.te.rpe}</span>}
                                                </div>
                                                {e.te.note_tecniche && (
                                                    <p className="text-xs text-slate-600 mt-2 italic">{e.te.note_tecniche}</p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {history.length > 0 && (
                <div className="pt-6 border-t border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Clock size={18} /> Storico allenamenti
                    </h2>
                    <div className="space-y-2">
                        {history.slice(0, 10).map((h) => (
                            <Link
                                key={h.id}
                                href={`/portal/workouts/log/${h.id}`}
                                className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 transition hover:border-slate-300 hover:shadow-sm"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900">
                                        {new Date(h.date_executed).toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long" })}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Giorno {h.giorno} • {h.status === "completed" ? "Completato" : "In corso"}
                                        {h.trainer_note && <span className="text-emerald-600 font-medium"> • Nota trainer</span>}
                                    </p>
                                </div>
                                {h.total_duration_seconds && (
                                    <span className="text-xs text-slate-500 shrink-0 ml-3">
                                        {Math.round(h.total_duration_seconds / 60)} min
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
