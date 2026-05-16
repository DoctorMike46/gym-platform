import Link from "next/link";
import { requireClientAuth } from "@/lib/client-auth";
import { getClientWorkouts } from "@/lib/actions/portal-workouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalWorkoutsListPage() {
    await requireClientAuth();
    const workouts = await getClientWorkouts();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">I miei allenamenti</h1>
                <p className="text-slate-500 text-sm mt-1">Schede assegnate dal tuo trainer</p>
            </div>

            {workouts.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Dumbbell size={32} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-sm text-slate-500">Nessuna scheda assegnata</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {workouts.map((w) => (
                        <Link key={w.assignment.id} href={`/portal/workouts/${w.assignment.id}`}>
                            <Card className="hover:shadow-md transition cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between pb-3">
                                    <CardTitle className="text-base">{w.template?.nome_template}</CardTitle>
                                    <div className="flex items-center gap-2">
                                        {w.assignment.attivo ? (
                                            <Badge className="bg-emerald-100 text-emerald-700">Attiva</Badge>
                                        ) : (
                                            <Badge variant="outline">Storica</Badge>
                                        )}
                                        <ChevronRight size={18} className="text-slate-400" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                        <span>{w.template?.split_settimanale}× a settimana</span>
                                        <span>•</span>
                                        <span>
                                            Assegnata il {new Date(w.assignment.data_assegnazione).toLocaleDateString("it-IT")}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
