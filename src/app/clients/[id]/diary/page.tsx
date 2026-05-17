import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getClientById } from "@/lib/actions/clients";
import {
    getClientWorkoutLogs,
    getClientMeasurements,
    getClientProgressPhotos,
} from "@/lib/actions/trainer-portal-mirror";
import { ArrowLeft } from "lucide-react";
import DiaryContent from "./diary-content";

export const dynamic = "force-dynamic";

export default async function ClientDiaryPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAuth();
    const { id } = await params;
    const clientId = parseInt(id);
    if (isNaN(clientId)) notFound();

    const [client, logs, measurements, photos] = await Promise.all([
        getClientById(clientId),
        getClientWorkoutLogs(clientId).catch(() => []),
        getClientMeasurements(clientId).catch(() => []),
        getClientProgressPhotos(clientId).catch(() => []),
    ]);

    if (!client) notFound();

    return (
        <div className="space-y-6">
            <Link href={`/clients/${clientId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                <ArrowLeft size={16} /> Torna al cliente
            </Link>

            <div>
                <h1 className="text-2xl md:text-3xl font-black brand-text">
                    Diario di {client.nome} {client.cognome}
                </h1>
                <p className="text-slate-500 text-sm mt-1">Allenamenti loggati e progressi</p>
            </div>

            <DiaryContent
                clientId={clientId}
                logs={logs}
                measurements={measurements}
                photos={photos}
            />
        </div>
    );
}
