"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, ImagePlus } from "lucide-react";
import { addBodyMeasurement, deleteBodyMeasurement, uploadProgressPhoto, deleteProgressPhoto, getProgressPhotoSignedUrl } from "@/lib/actions/portal-progress";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";

type Measurement = {
    id: number;
    date: string;
    peso_kg: string | null;
    body_fat_pct: string | null;
    vita_cm: string | null;
    fianchi_cm: string | null;
    petto_cm: string | null;
    braccio_cm: string | null;
    coscia_cm: string | null;
    note: string | null;
};

type Photo = {
    id: number;
    date: string;
    r2_key: string;
    type: string;
    note: string | null;
};

export default function ProgressContent({
    initialMeasurements,
    initialPhotos,
}: {
    initialMeasurements: Measurement[];
    initialPhotos: Photo[];
}) {
    const [measurements, setMeasurements] = useState(initialMeasurements);
    const [photos, setPhotos] = useState(initialPhotos);
    const [pending, start] = useTransition();
    const [open, setOpen] = useState(false);
    const today = new Date().toISOString().slice(0, 10);

    const [form, setForm] = useState<Record<string, string>>({
        date: today,
        peso_kg: "",
        body_fat_pct: "",
        vita_cm: "",
        fianchi_cm: "",
        petto_cm: "",
        braccio_cm: "",
        coscia_cm: "",
        note: "",
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        start(async () => {
            const result = await addBodyMeasurement({
                date: form.date,
                peso_kg: form.peso_kg || undefined,
                body_fat_pct: form.body_fat_pct || undefined,
                vita_cm: form.vita_cm || undefined,
                fianchi_cm: form.fianchi_cm || undefined,
                petto_cm: form.petto_cm || undefined,
                braccio_cm: form.braccio_cm || undefined,
                coscia_cm: form.coscia_cm || undefined,
                note: form.note || undefined,
            });
            if (result.success) {
                toast.success("Misurazione salvata");
                setOpen(false);
                setForm({ ...form, peso_kg: "", body_fat_pct: "", vita_cm: "", fianchi_cm: "", petto_cm: "", braccio_cm: "", coscia_cm: "", note: "" });
                // optimistic refresh — server-side cache will revalidate, but we update local state for UI
                location.reload();
            } else {
                toast.error("Errore");
            }
        });
    }

    async function handleDeleteMeasurement(id: number) {
        if (!confirm("Eliminare questa misurazione?")) return;
        const result = await deleteBodyMeasurement(id);
        if (result.success) {
            setMeasurements(measurements.filter((m) => m.id !== id));
            toast.success("Eliminata");
        }
    }

    async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, type: string) {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", type);
        fd.append("date", today);
        start(async () => {
            const result = await uploadProgressPhoto(fd);
            if (result.success) {
                toast.success("Foto caricata");
                location.reload();
            } else {
                toast.error(result.error || "Errore");
            }
        });
    }

    async function openPhoto(id: number) {
        try {
            const url = await getProgressPhotoSignedUrl(id);
            window.open(url, "_blank");
        } catch {
            toast.error("Errore caricamento foto");
        }
    }

    async function handleDeletePhoto(id: number) {
        if (!confirm("Eliminare questa foto?")) return;
        const result = await deleteProgressPhoto(id);
        if (result.success) {
            setPhotos(photos.filter((p) => p.id !== id));
            toast.success("Eliminata");
        }
    }

    const chartData = [...measurements]
        .reverse()
        .filter((m) => m.peso_kg)
        .map((m) => ({
            date: new Date(m.date).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
            peso: parseFloat(m.peso_kg!),
            bf: m.body_fat_pct ? parseFloat(m.body_fat_pct) : null,
        }));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">Progressi</h1>
                <p className="text-slate-500 text-sm mt-1">Traccia misurazioni e foto</p>
            </div>

            <Tabs defaultValue="measurements">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="measurements">Misurazioni</TabsTrigger>
                    <TabsTrigger value="photos">Foto</TabsTrigger>
                </TabsList>

                <TabsContent value="measurements" className="space-y-4 mt-4">
                    {chartData.length >= 2 && (
                        <Card>
                            <CardContent className="py-4">
                                <p className="text-xs text-slate-500 font-semibold uppercase mb-3">Andamento peso</p>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="peso" stroke="#003366" strokeWidth={2} dot={{ r: 3 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!open ? (
                        <Button onClick={() => setOpen(true)} className="w-full gap-2">
                            <Plus size={16} /> Nuova misurazione
                        </Button>
                    ) : (
                        <Card>
                            <CardContent className="py-4">
                                <form onSubmit={handleSubmit} className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label htmlFor="date" className="text-xs">Data</Label>
                                            <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                                        </div>
                                        <div>
                                            <Label htmlFor="peso" className="text-xs">Peso (kg)</Label>
                                            <Input id="peso" type="number" step="0.1" value={form.peso_kg} onChange={(e) => setForm({ ...form, peso_kg: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label htmlFor="bf" className="text-xs">Body fat %</Label>
                                            <Input id="bf" type="number" step="0.1" value={form.body_fat_pct} onChange={(e) => setForm({ ...form, body_fat_pct: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label htmlFor="vita" className="text-xs">Vita (cm)</Label>
                                            <Input id="vita" type="number" step="0.1" value={form.vita_cm} onChange={(e) => setForm({ ...form, vita_cm: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label htmlFor="fianchi" className="text-xs">Fianchi (cm)</Label>
                                            <Input id="fianchi" type="number" step="0.1" value={form.fianchi_cm} onChange={(e) => setForm({ ...form, fianchi_cm: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label htmlFor="petto" className="text-xs">Petto (cm)</Label>
                                            <Input id="petto" type="number" step="0.1" value={form.petto_cm} onChange={(e) => setForm({ ...form, petto_cm: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label htmlFor="braccio" className="text-xs">Braccio (cm)</Label>
                                            <Input id="braccio" type="number" step="0.1" value={form.braccio_cm} onChange={(e) => setForm({ ...form, braccio_cm: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label htmlFor="coscia" className="text-xs">Coscia (cm)</Label>
                                            <Input id="coscia" type="number" step="0.1" value={form.coscia_cm} onChange={(e) => setForm({ ...form, coscia_cm: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="note" className="text-xs">Note</Label>
                                        <textarea id="note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" rows={2} />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Annulla</Button>
                                        <Button type="submit" disabled={pending} className="flex-1">{pending ? "Salvataggio…" : "Salva"}</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    <div className="space-y-3">
                        {measurements.length === 0 ? (
                            <Card><CardContent className="py-8 text-center"><p className="text-sm text-slate-500">Nessuna misurazione</p></CardContent></Card>
                        ) : (
                            measurements.map((m) => (
                                <Card key={m.id}>
                                    <CardContent className="py-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-sm font-semibold text-slate-900">
                                                {new Date(m.date).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                                            </p>
                                            <button onClick={() => handleDeleteMeasurement(m.id)} className="text-slate-400 hover:text-rose-600">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
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
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="photos" className="space-y-4 mt-4">
                    <div className="grid grid-cols-3 gap-2">
                        {(["front", "side", "back"] as const).map((t) => (
                            <label key={t} className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                                <ImagePlus size={20} className="text-slate-400" />
                                <span className="text-[10px] uppercase font-semibold text-slate-500">{t === "front" ? "Frontale" : t === "side" ? "Laterale" : "Posteriore"}</span>
                                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, t)} className="hidden" />
                            </label>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {photos.map((p) => (
                            <div key={p.id} className="aspect-square bg-slate-100 rounded-xl overflow-hidden relative group">
                                <button onClick={() => openPhoto(p.id)} className="w-full h-full flex items-center justify-center text-xs text-slate-500 hover:text-slate-700">
                                    <span>{p.type === "front" ? "Frontale" : p.type === "side" ? "Laterale" : "Posteriore"}<br/>{new Date(p.date).toLocaleDateString("it-IT")}</span>
                                </button>
                                <button onClick={() => handleDeletePhoto(p.id)} className="absolute top-1 right-1 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow text-rose-600">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {photos.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">Nessuna foto</p>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
