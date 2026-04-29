import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getClientById } from "@/lib/actions/clients";
import {
    getClientWorkoutLogs,
    getClientMeasurements,
    getClientProgressPhotos,
} from "@/lib/actions/trainer-portal-mirror";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import DiaryPhotoGrid from "./photo-grid";

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
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                    Diario di {client.nome} {client.cognome}
                </h1>
                <p className="text-slate-500 text-sm mt-1">Allenamenti loggati e progressi</p>
            </div>

            <Tabs defaultValue="logs">
                <TabsList className="w-full overflow-x-auto justify-start sm:w-auto sm:justify-center">
                    <TabsTrigger value="logs" className="text-xs sm:text-sm">
                        <span className="sm:hidden">Allen. ({logs.length})</span>
                        <span className="hidden sm:inline">Allenamenti ({logs.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="measurements" className="text-xs sm:text-sm">
                        <span className="sm:hidden">Misur. ({measurements.length})</span>
                        <span className="hidden sm:inline">Misurazioni ({measurements.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="photos" className="text-xs sm:text-sm">Foto ({photos.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="logs" className="space-y-3 mt-4">
                    {logs.length === 0 && <p className="text-sm text-slate-500">Nessun allenamento loggato.</p>}
                    {logs.map((l) => (
                        <Link key={l.id} href={`/clients/${clientId}/diary/${l.id}`} className="block">
                            <Card className="transition-all hover:border-slate-300 hover:shadow-sm">
                                <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900">
                                            {new Date(l.date_executed).toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                                            <span>Giorno {l.giorno}</span>
                                            {l.total_duration_seconds && (
                                                <>
                                                    <span>•</span>
                                                    <span>{Math.round(l.total_duration_seconds / 60)} min</span>
                                                </>
                                            )}
                                            {l.trainer_note && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-emerald-600 font-medium">Hai lasciato una nota</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <Badge variant={l.status === "completed" ? "default" : "outline"} className="self-start sm:self-auto">
                                        {l.status === "completed" ? "Completato" : l.status === "in_progress" ? "In corso" : "Saltato"}
                                    </Badge>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </TabsContent>

                <TabsContent value="measurements" className="space-y-3 mt-4">
                    {measurements.length === 0 && <p className="text-sm text-slate-500">Nessuna misurazione registrata.</p>}
                    {measurements.map((m) => (
                        <Card key={m.id}>
                            <CardContent className="py-4">
                                <p className="text-sm font-semibold text-slate-900">
                                    {new Date(m.date).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                                </p>
                                <div className="flex flex-wrap gap-3 text-xs text-slate-600 mt-2">
                                    {m.peso_kg && <span><strong>{m.peso_kg}</strong> kg</span>}
                                    {m.body_fat_pct && <span>BF {m.body_fat_pct}%</span>}
                                    {m.vita_cm && <span>Vita {m.vita_cm} cm</span>}
                                    {m.fianchi_cm && <span>Fianchi {m.fianchi_cm} cm</span>}
                                    {m.petto_cm && <span>Petto {m.petto_cm} cm</span>}
                                    {m.braccio_cm && <span>Braccio {m.braccio_cm} cm</span>}
                                    {m.coscia_cm && <span>Coscia {m.coscia_cm} cm</span>}
                                </div>
                                {m.note && <p className="text-xs text-slate-500 mt-2 italic">{m.note}</p>}
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                <TabsContent value="photos" className="mt-4">
                    <DiaryPhotoGrid photos={photos} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
