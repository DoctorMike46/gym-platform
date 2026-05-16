"use client";

import { useEffect, useState } from "react";
import {
    Activity,
    Footprints,
    Flame,
    Heart,
    Moon,
    Scale,
    RefreshCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    getClientHealthSnapshot,
    type ClientHealthSnapshot,
} from "@/lib/actions/health";

const METRIC_LABELS = {
    weight: { label: "Peso", icon: Scale, color: "emerald" },
    steps: { label: "Passi", icon: Footprints, color: "blue" },
    heart_rate_resting: { label: "Battito riposo", icon: Heart, color: "rose" },
    active_energy: { label: "Calorie attive", icon: Flame, color: "amber" },
    sleep_hours: { label: "Sonno", icon: Moon, color: "indigo" },
    workout_minutes: { label: "Workout", icon: Activity, color: "violet" },
} as const;

type MetricKey = keyof typeof METRIC_LABELS;

const COLOR_CLASSES: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
};

function formatValue(type: MetricKey, value: string, unit: string): string {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return value;
    if (type === "weight") return `${n.toFixed(1)} ${unit}`;
    if (type === "steps")
        return n.toLocaleString("it-IT", { maximumFractionDigits: 0 });
    return `${Math.round(n)} ${unit}`;
}

function formatAgo(iso: string): string {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ora";
    if (mins < 60) return `${mins}m fa`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h fa`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}g fa`;
    return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export function ClientHealthCard({ clientId }: { clientId: number }) {
    const [snap, setSnap] = useState<ClientHealthSnapshot | null>(null);
    const [loading, setLoading] = useState(true);

    async function refresh() {
        setLoading(true);
        try {
            const r = await getClientHealthSnapshot(clientId);
            setSnap(r);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId]);

    const latest = snap?.latest ?? {};
    const tiles = (Object.keys(METRIC_LABELS) as MetricKey[])
        .map((k) => ({ key: k, sample: latest[k] }))
        .filter((t) => t.sample !== undefined);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Heart size={18} className="text-rose-500" />
                    Salute & biometria
                </CardTitle>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={refresh}
                    disabled={loading}
                    className="text-xs gap-1"
                >
                    <RefreshCcw size={12} className={loading ? "animate-spin" : ""} />
                    Aggiorna
                </Button>
            </CardHeader>
            <CardContent>
                {loading && !snap ? (
                    <div className="py-4 text-sm text-slate-500">Caricamento…</div>
                ) : tiles.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                        <Heart
                            size={28}
                            className="text-slate-300 mx-auto mb-2"
                            strokeWidth={1.5}
                        />
                        <p className="text-sm text-slate-600 font-medium">
                            Nessun dato biometrico sincronizzato
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Il cliente non ha ancora collegato Apple Salute / Health
                            Connect dall&apos;app mobile.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {tiles.map(({ key, sample }) => {
                                if (!sample) return null;
                                const meta = METRIC_LABELS[key];
                                const Icon = meta.icon;
                                return (
                                    <div
                                        key={key}
                                        className={`rounded-lg border px-3 py-2.5 ${COLOR_CLASSES[meta.color]}`}
                                    >
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-80">
                                            <Icon size={11} />
                                            {meta.label}
                                        </div>
                                        <div className="text-base font-bold tabular-nums mt-0.5">
                                            {formatValue(key, sample.value, sample.unit)}
                                        </div>
                                        <div className="text-[10px] opacity-70">
                                            {formatAgo(sample.recorded_at)} ·{" "}
                                            {sample.source === "apple_health"
                                                ? "Apple Health"
                                                : sample.source === "health_connect"
                                                  ? "Health Connect"
                                                  : "Manuale"}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {snap && snap.samples.length > 0 && (
                            <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className="bg-slate-50 text-slate-600 border-slate-200"
                                >
                                    {snap.samples.length} campioni · ultimi 30 giorni
                                </Badge>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
