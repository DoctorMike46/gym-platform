"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, RefreshCw } from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

export function GrowthChart({
    data,
    primaryColor,
}: {
    data: { month: string; clienti: number }[];
    primaryColor: string;
}) {
    return (
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    <CardTitle className="text-lg text-slate-800">
                        Crescita Clienti (Ultimi 6 mesi)
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {data.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                        <TrendingUp className="h-10 w-10 mx-auto opacity-20 mb-2" />
                        <p className="text-sm">
                            Non ci sono ancora dati sufficienti per il grafico.
                        </p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient
                                    id="colorClienti"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor={primaryColor}
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={primaryColor}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f1f5f9"
                            />
                            <XAxis
                                dataKey="month"
                                tick={{ fill: "#94a3b8", fontSize: 12 }}
                                axisLine={{ stroke: "#e2e8f0" }}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fill: "#94a3b8", fontSize: 12 }}
                                axisLine={{ stroke: "#e2e8f0" }}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: "#fff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                    padding: "12px 16px",
                                }}
                                labelStyle={{
                                    fontWeight: 600,
                                    color: "#1e293b",
                                    marginBottom: 4,
                                }}
                                formatter={(value: number | undefined) => [
                                    `${value ?? 0} nuovi clienti`,
                                    "",
                                ]}
                            />
                            <Area
                                type="monotone"
                                dataKey="clienti"
                                stroke={primaryColor}
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorClienti)"
                                dot={{
                                    fill: primaryColor,
                                    stroke: "#fff",
                                    strokeWidth: 2,
                                    r: 5,
                                }}
                                activeDot={{ r: 7, stroke: primaryColor, strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

export function ChurnCard({
    expiredThisMonth,
    newSubsThisMonth,
    activeClients,
}: {
    expiredThisMonth: number;
    newSubsThisMonth: number;
    activeClients: number;
}) {
    const totalRelevant = expiredThisMonth + newSubsThisMonth;
    const retentionRate =
        totalRelevant > 0
            ? Math.round((newSubsThisMonth / totalRelevant) * 100)
            : activeClients > 0
                ? 100
                : 0;

    return (
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg text-slate-800">
                        Ritenzione & Churn (Mese)
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    {/* New Subs */}
                    <div className="space-y-2">
                        <div className="text-3xl font-bold text-emerald-600">
                            {newSubsThisMonth}
                        </div>
                        <p className="text-xs text-slate-500">
                            Nuovi Abbonamenti
                        </p>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none text-xs">
                            Acquisiti
                        </Badge>
                    </div>

                    {/* Expired */}
                    <div className="space-y-2">
                        <div className="text-3xl font-bold text-rose-600">
                            {expiredThisMonth}
                        </div>
                        <p className="text-xs text-slate-500">
                            Abbonamenti Scaduti
                        </p>
                        <Badge className="bg-rose-100 text-rose-700 border-rose-200 shadow-none text-xs">
                            Persi
                        </Badge>
                    </div>

                    {/* Retention Rate */}
                    <div className="space-y-2">
                        <div
                            className={`text-3xl font-bold ${retentionRate >= 70
                                ? "text-emerald-600"
                                : retentionRate >= 40
                                    ? "text-amber-600"
                                    : "text-rose-600"
                                }`}
                        >
                            {retentionRate}%
                        </div>
                        <p className="text-xs text-slate-500">
                            Tasso Ritenzione
                        </p>
                        <Badge
                            className={`shadow-none text-xs ${retentionRate >= 70
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : retentionRate >= 40
                                    ? "bg-amber-100 text-amber-700 border-amber-200"
                                    : "bg-rose-100 text-rose-700 border-rose-200"
                                }`}
                        >
                            {retentionRate >= 70
                                ? "Ottimo"
                                : retentionRate >= 40
                                    ? "Attenzione"
                                    : "Critico"}
                        </Badge>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Bilancio Churn / Acquisizione</span>
                        <span>
                            {newSubsThisMonth > expiredThisMonth ? "+" : ""}
                            {newSubsThisMonth - expiredThisMonth} netto
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                        {totalRelevant > 0 ? (
                            <>
                                <div
                                    className="h-3 bg-emerald-500 transition-all duration-500"
                                    style={{
                                        width: `${(newSubsThisMonth / totalRelevant) * 100}%`,
                                    }}
                                />
                                <div
                                    className="h-3 bg-rose-400 transition-all duration-500"
                                    style={{
                                        width: `${(expiredThisMonth / totalRelevant) * 100}%`,
                                    }}
                                />
                            </>
                        ) : (
                            <div className="h-3 bg-slate-200 w-full" />
                        )}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            Acquisiti
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                            Persi
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
