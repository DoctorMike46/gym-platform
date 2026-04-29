import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { getClientWorkoutLogDetail } from "@/lib/actions/trainer-portal-mirror";
import { LogDetailView } from "@/components/workouts/log-detail-view";
import { TrainerNoteEditor } from "@/components/workouts/trainer-note-editor";

export const dynamic = "force-dynamic";

export default async function TrainerWorkoutLogDetailPage({
    params,
}: {
    params: Promise<{ id: string; logId: string }>;
}) {
    await requireAuth();
    const { id, logId } = await params;
    const clientId = parseInt(id);
    const workoutLogId = parseInt(logId);
    if (isNaN(clientId) || isNaN(workoutLogId)) notFound();

    let data;
    try {
        data = await getClientWorkoutLogDetail(workoutLogId);
    } catch {
        notFound();
    }

    return (
        <div className="space-y-6">
            <Link
                href={`/clients/${clientId}/diary`}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
                <ArrowLeft size={16} /> Torna al diario
            </Link>

            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                    Sessione di {data.client.nome} {data.client.cognome}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Dettaglio set/reps/peso e commento al cliente
                </p>
            </div>

            <LogDetailView
                data={data}
                trainerNoteSlot={
                    <TrainerNoteEditor
                        logId={workoutLogId}
                        initialNote={data.log.trainer_note}
                        initialUpdatedAt={data.log.trainer_note_updated_at}
                    />
                }
            />
        </div>
    );
}
