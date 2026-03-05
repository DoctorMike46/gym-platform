import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getDashboardStats } from "@/lib/actions/dashboard";

export default async function Dashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Benvenuto, Coach! Ecco una panoramica della tua attività.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/clients">
            <Button variant="outline" className="text-[#003366] border-[#003366] hover:bg-blue-50">Gestisci Clienti</Button>
          </Link>
          <Link href="/workouts/builder">
            <Button className="bg-[#003366] hover:bg-blue-900 border text-white">Crea Nuova Scheda</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white border-slate-200 shadow-sm text-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totale clienti attivi</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClients}</div>
            <p className="text-xs text-slate-500 mt-1">Clienti con abbonamento attivo</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm text-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In scadenza (14gg)</CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{stats.expiringSoon}</div>
            <p className="text-xs text-slate-500 mt-1">Richiedono rinnovo</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm text-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nuovi Iscritti (Mese)</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.newClients}</div>
            <p className="text-xs text-slate-500 mt-1">Registrati questo mese</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm min-h-[300px] flex flex-col items-center justify-center gap-4">
        <TrendingUp className="h-12 w-12 opacity-10" />
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Analisi Performance</h3>
          <p className="max-w-md mx-auto">Presto qui potrai vedere grafici dettagliati sull'andamento del tuo business e dei tuoi atleti.</p>
        </div>
        <Button variant="outline" className="border-slate-300">Configura Obiettivi</Button>
      </div>
    </div>
  );
}

