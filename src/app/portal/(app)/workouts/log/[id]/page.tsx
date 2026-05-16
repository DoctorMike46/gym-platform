import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireClientAuth } from "@/lib/client-auth";
import { getWorkoutLogWithExercises } from "@/lib/actions/portal-workouts";
import { LogDetailView } from "@/components/workouts/log-detail-view";

export const dynamic = "force-dynamic";

export default async function ClientWorkoutLogDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireClientAuth();
    const { id } = await params;
    const logId = parseInt(id);
    if (isNaN(logId)) notFound();

    let data;
    try {
        data = await getWorkoutLogWithExercises(logId);
    } catch {
        notFound();
    }

    const backHref = data.log.assignment_id
        ? `/portal/workouts/${data.log.assignment_id}`
        : "/portal/workouts";

    return (
        <div className="space-y-6">
            <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
                <ArrowLeft size={16} /> Torna agli allenamenti
            </Link>

            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                    Riepilogo allenamento
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Cosa hai fatto in questa sessione
                </p>
            </div>

            <LogDetailView data={data} />
        </div>
    );
}
