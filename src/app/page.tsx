import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertCircle, TrendingUp, DollarSign, Award, CalendarClock, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { getSettings } from "@/lib/actions/settings";
import { GrowthChart, ChurnCard } from "./dashboard-charts";

export default async function Dashboard() {
  const stats = await getDashboardStats();
  const settingsData = await getSettings();
  const primaryColor = settingsData?.primary_color || "#003366";

  const totalServicesSold = stats.topServices.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Benvenuto, Coach! Ecco una panoramica della tua attività.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/clients">
            <Button variant="outline" className="brand-text brand-border brand-hover-bg">Gestisci Clienti</Button>
          </Link>
          <Link href="/workouts/builder">
            <Button className="brand-bg text-white">Crea Nuova Scheda</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-slate-200 shadow-sm text-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totale Clienti</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="brand-text font-semibold">{stats.activeClients}</span> con abbonamento attivo
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm text-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entrate Attive Stimate</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              €{(stats.estimatedRevenue / 100).toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Da {stats.activeClients} abbonamenti attivi</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm text-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Scadenza (14gg)</CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{stats.expiringSoon}</div>
            <p className="text-xs text-slate-500 mt-1">Richiedono rinnovo presto</p>
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

      {/* Analytics Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Services */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 brand-text" />
              <CardTitle className="text-lg text-slate-800">Servizi Più Venduti</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {stats.topServices.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <Award className="h-10 w-10 mx-auto opacity-20 mb-2" />
                <p className="text-sm">Nessun servizio assegnato ancora.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.topServices.map((service, i) => {
                  const percentage = totalServicesSold > 0 ? Math.round((service.count / totalServicesSold) * 100) : 0;
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{service.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600 shadow-none">
                            {service.count} clienti
                          </Badge>
                          <span className="text-xs font-semibold brand-text">{percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full brand-bg transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Clients */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-rose-500" />
                <CardTitle className="text-lg text-slate-800">Abbonamenti in Scadenza</CardTitle>
              </div>
              {stats.expiringSoon > 0 && (
                <Badge className="bg-rose-100 text-rose-700 border-rose-200 shadow-none">
                  {stats.expiringSoon} in scadenza
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {stats.expiringClients.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <UserCheck className="h-10 w-10 mx-auto opacity-20 mb-2" />
                <p className="text-sm">Nessun abbonamento in scadenza nei prossimi 14 giorni. 🎉</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.expiringClients.map((client, i) => {
                  const expiryDate = client.expiryDate ? new Date(client.expiryDate) : null;
                  const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                  return (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{client.clientName}</p>
                        <p className="text-xs text-slate-400">{client.serviceName}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={`shadow-none text-xs ${daysLeft !== null && daysLeft <= 3
                            ? "bg-rose-100 text-rose-700 border-rose-200"
                            : daysLeft !== null && daysLeft <= 7
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-blue-100 text-blue-700 border-blue-200"
                            }`}
                        >
                          {daysLeft !== null ? (daysLeft <= 0 ? "Scade oggi" : `${daysLeft} giorni`) : "-"}
                        </Badge>
                        {expiryDate && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            {expiryDate.toLocaleDateString('it-IT')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Growth Chart & Churn Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <GrowthChart data={stats.monthlyGrowth} primaryColor={primaryColor} />
        <ChurnCard
          expiredThisMonth={stats.churn.expiredThisMonth}
          newSubsThisMonth={stats.churn.newSubsThisMonth}
          activeClients={stats.activeClients}
        />
      </div>
    </div>
  );
}
