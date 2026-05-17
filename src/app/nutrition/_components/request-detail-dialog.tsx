"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    declineNutritionRequest,
    getNutritionRequestDetail,
    markNutritionRequestInReview,
} from "@/lib/actions/nutrition-requests";
import type { NutritionRequest } from "@/lib/services/nutrition-requests.types";
import { Loader2 } from "lucide-react";

interface Props {
    id: number | null;
    onClose: () => void;
    onChanged?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
    pending: "In attesa",
    in_review: "In revisione",
    approved: "Approvata",
    declined: "Rifiutata",
};

function formatDate(d: Date | string | null | undefined): string {
    if (!d) return "—";
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-2">
            <h4 className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{title}</h4>
            <div className="text-sm space-y-1">{children}</div>
        </section>
    );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3 py-0.5">
            <span className="text-slate-500 shrink-0">{label}</span>
            <span className="text-slate-800 text-right font-medium break-words">
                {value || <span className="text-slate-400">—</span>}
            </span>
        </div>
    );
}

function ChipList({ items }: { items: string[] | null | undefined }) {
    if (!items || items.length === 0) return <span className="text-slate-400">—</span>;
    return (
        <div className="flex flex-wrap justify-end gap-1">
            {items.map((it, i) => (
                <span key={`${it}-${i}`} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">
                    {it}
                </span>
            ))}
        </div>
    );
}

export function RequestDetailDialog({ id, onClose, onChanged }: Props) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [data, setData] = useState<NutritionRequest | null>(null);
    const [loading, setLoading] = useState(false);
    const [declineMode, setDeclineMode] = useState(false);
    const [declineReason, setDeclineReason] = useState("");

    // Carica dettaglio quando id cambia
    if (id !== null && !loading && data?.id !== id) {
        setLoading(true);
        setData(null);
        getNutritionRequestDetail(id)
            .then((res) => {
                if (res.success) setData(res.request);
                else toast.error("Richiesta non trovata");
            })
            .finally(() => setLoading(false));
    }

    function handleClose() {
        setData(null);
        setDeclineMode(false);
        setDeclineReason("");
        onClose();
    }

    function handleMarkInReview() {
        if (!data) return;
        startTransition(async () => {
            const res = await markNutritionRequestInReview(data.id);
            if (res.success) {
                toast.success("Richiesta marcata come in revisione");
                setData(res.request);
                onChanged?.();
            } else {
                toast.error("Impossibile aggiornare la richiesta");
            }
        });
    }

    function handleDeclineConfirm() {
        if (!data) return;
        const reason = declineReason.trim();
        if (!reason) {
            toast.error("Motivo del rifiuto obbligatorio");
            return;
        }
        startTransition(async () => {
            const res = await declineNutritionRequest(data.id, reason);
            if (res.success) {
                toast.success("Richiesta rifiutata. Il cliente è stato notificato.");
                setData(res.request);
                setDeclineMode(false);
                setDeclineReason("");
                onChanged?.();
            } else {
                toast.error("Impossibile rifiutare la richiesta");
            }
        });
    }

    function handleCreatePlan() {
        if (!data) return;
        router.push(`/nutrition/new?request_id=${data.id}&client_id=${data.client_id}`);
    }

    const open = id !== null;

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="brand-text">Richiesta piano alimentare</DialogTitle>
                    <DialogDescription>
                        Snapshot inviato dal cliente. Tutti i dati sensibili sono cifrati a riposo.
                    </DialogDescription>
                </DialogHeader>

                {loading || !data ? (
                    <div className="py-12 flex items-center justify-center text-slate-500">
                        <Loader2 className="animate-spin mr-2" size={18} /> Caricamento…
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline">{STATUS_LABEL[data.status] ?? data.status}</Badge>
                            <span className="text-xs text-slate-500">
                                Inviata: {formatDate(data.requested_at)}
                            </span>
                        </div>

                        <Section title="Obiettivo">
                            <Field label="Tipo" value={data.obiettivo} />
                            <Field label="Timeframe" value={data.timeframe_settimane ? `${data.timeframe_settimane} settimane` : null} />
                            <Field label="Peso target" value={data.peso_target_kg ? `${data.peso_target_kg} kg` : null} />
                            <Field label="Motivazione" value={data.motivazione} />
                        </Section>

                        <Section title="Alimentazione">
                            <Field label="Regime" value={data.regime_alimentare} />
                            <Field label="Allergeni" value={<ChipList items={data.allergeni} />} />
                            <Field label="Intolleranze" value={<ChipList items={data.intolleranze} />} />
                            <Field label="Cibi preferiti" value={<ChipList items={data.cibi_preferiti} />} />
                            <Field label="Cibi da evitare" value={<ChipList items={data.cibi_evitati} />} />
                        </Section>

                        <Section title="Preferenze pasti">
                            <Field label="N. pasti/die" value={data.n_pasti_die} />
                            <Field label="Orari" value={<ChipList items={data.orari_pasti} />} />
                            <Field label="Occasioni sociali/sett." value={data.occasioni_sociali} />
                        </Section>

                        <Section title="Lifestyle">
                            <Field label="Ore sonno" value={data.ore_sonno} />
                            <Field label="Stress (1-10)" value={data.livello_stress} />
                            <Field label="Acqua (L/die)" value={data.consumo_acqua_litri} />
                            <Field label="Fumo" value={data.fumo} />
                            <Field
                                label="Integratori"
                                value={
                                    data.integratori && data.integratori.length > 0
                                        ? data.integratori.map((i) => `${i.nome}${i.dosaggio ? ` (${i.dosaggio})` : ""}`).join(", ")
                                        : null
                                }
                            />
                        </Section>

                        {(data.patologie || data.farmaci || data.note_libere) && (
                            <Section title="Storico medico (art.9 GDPR)">
                                <Field label="Patologie" value={data.patologie} />
                                <Field label="Farmaci" value={data.farmaci} />
                                <Field label="Note libere" value={data.note_libere} />
                            </Section>
                        )}

                        {data.trainer_decline_reason && (
                            <Section title="Motivo del rifiuto">
                                <p className="text-sm text-slate-700">{data.trainer_decline_reason}</p>
                            </Section>
                        )}
                    </div>
                )}

                {declineMode && (
                    <div className="mt-4 space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            Motivo del rifiuto (visibile al cliente)
                        </label>
                        <Textarea
                            placeholder="Spiega al cliente perché non procedi con il piano…"
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            rows={3}
                        />
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-2">
                    {data && (data.status === "pending" || data.status === "in_review") ? (
                        declineMode ? (
                            <>
                                <Button variant="ghost" onClick={() => setDeclineMode(false)} disabled={pending}>
                                    Annulla
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeclineConfirm}
                                    disabled={pending || !declineReason.trim()}
                                >
                                    Conferma rifiuto
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="ghost" onClick={() => setDeclineMode(true)} disabled={pending}>
                                    Rifiuta
                                </Button>
                                {data.status === "pending" && (
                                    <Button variant="outline" onClick={handleMarkInReview} disabled={pending}>
                                        Segna in revisione
                                    </Button>
                                )}
                                <Button className="brand-bg text-white" onClick={handleCreatePlan} disabled={pending}>
                                    Crea piano
                                </Button>
                            </>
                        )
                    ) : (
                        <Button variant="ghost" onClick={handleClose}>Chiudi</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
