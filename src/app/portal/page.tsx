import Link from "next/link";
import { requireClientAuth } from "@/lib/client-auth";
import { getMyProfile, getMyActiveSubscription } from "@/lib/actions/portal-profile";
import { getClientWorkouts } from "@/lib/actions/portal-workouts";
import { getBodyMeasurements } from "@/lib/actions/portal-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, TrendingUp, FileText, Calendar, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
    await requireClientAuth();
    const [profile, sub, workouts, measurements] = await Promise.all([
        getMyProfile(),
        getMyActiveSubscription(),
        getClientWorkouts(),
        getBodyMeasurements(),
    ]);

    const activeWorkout = workouts.find((w) => w.assignment.attivo);
    const lastMeasurement = measurements[0];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                    Ciao {profile?.nome} 👋
                </h1>
                <p className="text-slate-500 text-sm mt-1">Bentornato sul tuo portale</p>
            </div>

            {sub && (
                <Card className="border-emerald-200 bg-emerald-50/40">
                    <CardContent className="py-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs text-emerald-700 font-medium">Abbonamento attivo</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{sub.service?.nome_servizio}</p>
                            {sub.sub.data_fine && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Scadenza: {new Date(sub.sub.data_fine).toLocaleDateString("it-IT")}
                                </p>
                            )}
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 shrink-0">Attivo</Badge>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href={activeWorkout ? `/portal/workouts/${activeWorkout.assignment.id}` : "/portal/workouts"}>
                    <Card className="hover:shadow-md transition cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Dumbbell size={18} /> Allenamento
                            </CardTitle>
                            <ChevronRight size={18} className="text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            {activeWorkout ? (
                                <>
                                    <p className="text-sm font-semibold text-slate-900">{activeWorkout.template?.nome_template}</p>
                                    <p className="text-xs text-slate-500 mt-1">{activeWorkout.template?.split_settimanale}× a settimana</p>
                                </>
                            ) : (
                                <p className="text-sm text-slate-500">Nessuna scheda assegnata</p>
                            )}
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/portal/progress">
                    <Card className="hover:shadow-md transition cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp size={18} /> Progressi
                            </CardTitle>
                            <ChevronRight size={18} className="text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            {lastMeasurement ? (
                                <>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Peso: {lastMeasurement.peso_kg || "—"} kg
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Aggiornato il {new Date(lastMeasurement.date).toLocaleDateString("it-IT")}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-slate-500">Inizia a tracciare</p>
                            )}
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/portal/documents">
                    <Card className="hover:shadow-md transition cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText size={18} /> Documenti
                            </CardTitle>
                            <ChevronRight size={18} className="text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500">Schede, certificati, contratti</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/portal/profile">
                    <Card className="hover:shadow-md transition cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar size={18} /> Profilo
                            </CardTitle>
                            <ChevronRight size={18} className="text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500">Dati personali e password</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
