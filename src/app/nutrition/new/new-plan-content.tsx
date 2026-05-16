"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
    AlertTriangle,
    ArrowLeft,
    Flame,
    Pencil,
    Sparkles,
    Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ClientCombobox } from "@/components/ui/client-combobox";
import { NutritionProfileDialog } from "@/components/nutrition/nutrition-profile-dialog";
import { updateClient } from "@/lib/actions/clients";
import {
    createMealPlan,
    generateMealPlanWithAI,
    getClientFullDataForNutrition,
    importMealPlanFromFile,
    replaceMealPlanMeals,
    type ClientNutritionFullData,
} from "@/lib/actions/nutrition";
import {
    ACTIVITY_LABELS,
    OBIETTIVO_LABELS,
    calcBMI,
    calcBMR,
    calcMacroTarget,
    calcTDEE,
    defaultMacroTarget,
    type Obiettivo,
} from "@/lib/nutrition/calcs";
import { detectAllergenConflicts } from "@/lib/nutrition/types";

type ClientLite = { id: number; nome: string; cognome: string };
type Mode = "manual" | "ai" | "import";

export function NewPlanContent({ clients }: { clients: ClientLite[] }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [mode, setMode] = useState<Mode>("manual");
    const [profileDialogOpen, setProfileDialogOpen] = useState(false);

    const [clientId, setClientId] = useState("");
    const [clientData, setClientData] = useState<ClientNutritionFullData | null>(null);
    const [loadingClient, setLoadingClient] = useState(false);

    // Form piano
    const [nome, setNome] = useState("");
    const [dataInizio, setDataInizio] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [dataFine, setDataFine] = useState("");
    const [attivo, setAttivo] = useState(true);
    const [note, setNote] = useState("");

    // Macros target (editabili)
    const [obiettivo, setObiettivo] = useState<Obiettivo>("mantenimento");
    const [kcalTarget, setKcalTarget] = useState("");
    const [proteineG, setProteineG] = useState("");
    const [carboG, setCarboG] = useState("");
    const [grassiG, setGrassiG] = useState("");

    // AI fields
    const [aiPreferenze, setAiPreferenze] = useState("");

    // Import fields
    const [importFile, setImportFile] = useState<File | null>(null);

    // Carica dati cliente quando cambia selezione
    useEffect(() => {
        if (!clientId) {
            setClientData(null);
            return;
        }
        let cancelled = false;
        setLoadingClient(true);
        (async () => {
            const r = await getClientFullDataForNutrition(parseInt(clientId, 10));
            if (cancelled) return;
            setClientData(r);
            setLoadingClient(false);
            if (r?.profile?.obiettivo_default) {
                setObiettivo(r.profile.obiettivo_default);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [clientId]);

    // Calcoli derivati. `macros` è sempre popolato:
    // - se possibile, calcolo preciso Mifflin-St Jeor (BMR × attività + obiettivo)
    // - altrimenti fallback su kcal/kg per obiettivo (default ~70kg se manca peso)
    const calc = useMemo(() => {
        if (!clientData) return null;
        const eta = clientData.client.eta ?? deriveAge(clientData.client.data_di_nascita);
        const bmr = calcBMR({
            sesso: clientData.profile?.sesso ?? null,
            pesoKg: clientData.derived.pesoKg,
            altezzaCm: clientData.derived.altezzaCm,
            eta,
        });
        const tdee = calcTDEE(bmr, clientData.profile?.livello_attivita ?? null);
        const bmi = calcBMI(clientData.derived.pesoKg, clientData.derived.altezzaCm);
        const macros =
            tdee && clientData.derived.pesoKg
                ? calcMacroTarget({
                      tdee,
                      pesoKg: clientData.derived.pesoKg,
                      obiettivo,
                  })
                : defaultMacroTarget({
                      obiettivo,
                      pesoKg: clientData.derived.pesoKg,
                  });
        const macrosAreEstimate = !(tdee && clientData.derived.pesoKg);
        return { eta, bmr, tdee, bmi, macros, macrosAreEstimate };
    }, [clientData, obiettivo]);

    // Auto-popola/ricalcola i target macros ogni volta che cambia cliente o
    // obiettivo. Sovrascrive sempre i valori (anche se editati): le modifiche
    // manuali sono accettate solo dopo l'ultimo cambio di cliente/obiettivo.
    useEffect(() => {
        if (!calc?.macros) return;
        setKcalTarget(String(calc.macros.kcal));
        setProteineG(String(calc.macros.proteine_g));
        setCarboG(String(calc.macros.carbo_g));
        setGrassiG(String(calc.macros.grassi_g));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId, obiettivo, calc?.macros?.kcal]);

    function applySuggestedMacros() {
        if (!calc?.macros) return;
        setKcalTarget(String(calc.macros.kcal));
        setProteineG(String(calc.macros.proteine_g));
        setCarboG(String(calc.macros.carbo_g));
        setGrassiG(String(calc.macros.grassi_g));
    }

    function reloadClient() {
        if (!clientId) return;
        const id = parseInt(clientId, 10);
        (async () => {
            const r = await getClientFullDataForNutrition(id);
            setClientData(r);
        })();
    }

    const profileIncomplete =
        clientData &&
        (!clientData.profile?.sesso ||
            !clientData.profile?.livello_attivita ||
            (clientData.profile?.allergeni?.length ?? 0) === 0);

    function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!clientId) {
            toast.error("Seleziona un cliente");
            return;
        }
        if (!nome.trim()) {
            toast.error("Inserisci il nome del piano");
            return;
        }
        if (mode === "import" && !importFile) {
            toast.error("Seleziona un file da importare");
            return;
        }

        startTransition(async () => {
            const fd = new FormData();
            fd.append("nome", nome);
            fd.append("data_inizio", dataInizio);
            if (dataFine) fd.append("data_fine", dataFine);
            if (note) fd.append("note", note);
            if (attivo) fd.append("attivo", "on");
            if (kcalTarget) fd.append("kcal_target", kcalTarget);
            if (proteineG) fd.append("proteine_g", proteineG);
            if (carboG) fd.append("carbo_g", carboG);
            if (grassiG) fd.append("grassi_g", grassiG);

            // 1. Crea piano
            const r = await createMealPlan(parseInt(clientId, 10), fd);
            if (!r.success) {
                toast.error(r.error || "Errore creazione piano");
                return;
            }
            const planId = r.id;

            // 2. Popola pasti se AI o Import
            if (mode === "ai") {
                const aiRes = await generateMealPlanWithAI({
                    clientId: parseInt(clientId, 10),
                    obiettivo,
                    kcalTarget: parseInt(kcalTarget, 10) || undefined,
                    proteineG: parseInt(proteineG, 10) || undefined,
                    carboG: parseInt(carboG, 10) || undefined,
                    grassiG: parseInt(grassiG, 10) || undefined,
                    preferenze: buildAiPreferences(clientData?.profile, aiPreferenze),
                });
                if (!aiRes.success) {
                    toast.error(`Piano creato ma AI fallita: ${aiRes.error}`);
                    router.push("/nutrition");
                    return;
                }
                await replaceMealPlanMeals(
                    planId,
                    aiRes.meals.map((m) => ({
                        giorno_settimana: m.giorno_settimana,
                        momento: m.momento,
                        ordine: m.ordine,
                        descrizione: m.descrizione,
                        kcal: m.kcal,
                        proteine_g: m.proteine_g,
                        carbo_g: m.carbo_g,
                        grassi_g: m.grassi_g,
                        note: m.note ?? null,
                        items: m.items
                            ? m.items.map((it) => ({
                                  alimento: it.alimento,
                                  quantita_g: it.quantita_g,
                                  kcal: it.kcal,
                                  proteine_g: it.proteine_g,
                                  carbo_g: it.carbo_g,
                                  grassi_g: it.grassi_g,
                                  note: it.note ?? null,
                                  alternatives: (it.alternatives ?? []).map((a) => ({
                                      alimento: a.alimento,
                                      quantita_g: a.quantita_g,
                                      kcal: a.kcal,
                                      proteine_g: a.proteine_g,
                                      carbo_g: a.carbo_g,
                                      grassi_g: a.grassi_g,
                                      note: a.note ?? null,
                                  })),
                              }))
                            : undefined,
                    })),
                );
                toast.success("Piano generato con AI");
            } else if (mode === "import" && importFile) {
                const importFd = new FormData();
                importFd.append("client_id", String(parseInt(clientId, 10)));
                importFd.append("file", importFile);
                const impRes = await importMealPlanFromFile(importFd);
                if (!impRes.success) {
                    toast.error(`Piano creato ma import fallito: ${impRes.error}`);
                    router.push("/nutrition");
                    return;
                }
                await replaceMealPlanMeals(
                    planId,
                    impRes.meals.map((m) => ({
                        giorno_settimana: m.giorno_settimana,
                        momento: m.momento,
                        ordine: m.ordine,
                        descrizione: m.descrizione,
                        kcal: m.kcal,
                        proteine_g: m.proteine_g,
                        carbo_g: m.carbo_g,
                        grassi_g: m.grassi_g,
                        note: m.note ?? null,
                        items: m.items
                            ? m.items.map((it) => ({
                                  alimento: it.alimento,
                                  quantita_g: it.quantita_g,
                                  kcal: it.kcal,
                                  proteine_g: it.proteine_g,
                                  carbo_g: it.carbo_g,
                                  grassi_g: it.grassi_g,
                                  note: it.note ?? null,
                                  alternatives: (it.alternatives ?? []).map((a) => ({
                                      alimento: a.alimento,
                                      quantita_g: a.quantita_g,
                                      kcal: a.kcal,
                                      proteine_g: a.proteine_g,
                                      carbo_g: a.carbo_g,
                                      grassi_g: a.grassi_g,
                                      note: a.note ?? null,
                                  })),
                              }))
                            : undefined,
                    })),
                );

                // Warning conflitti allergeni
                if (clientData?.profile?.allergeni && clientData.profile.allergeni.length > 0) {
                    const allItems = impRes.meals.flatMap((m) =>
                        (m.items ?? []).map((it) => ({
                            alimento: it.alimento,
                            quantita_g: it.quantita_g,
                            kcal: it.kcal,
                            proteine_g: it.proteine_g,
                            carbo_g: it.carbo_g,
                            grassi_g: it.grassi_g,
                            note: it.note ?? null,
                            alternatives: (it.alternatives ?? []).map((a) => ({
                                alimento: a.alimento,
                                quantita_g: a.quantita_g,
                                kcal: a.kcal,
                                proteine_g: a.proteine_g,
                                carbo_g: a.carbo_g,
                                grassi_g: a.grassi_g,
                                note: a.note ?? null,
                            })),
                        })),
                    );
                    const conflicts = detectAllergenConflicts(
                        allItems,
                        clientData.profile.allergeni,
                    );
                    if (conflicts.length > 0) {
                        const unique = Array.from(
                            new Set(
                                conflicts.map((c) => `${c.allergene} in "${c.item}"`),
                            ),
                        ).slice(0, 5);
                        toast.warning(
                            `Attenzione: rilevati allergeni nel piano (${unique.join("; ")}). Controllalo dal pulsante Modifica.`,
                            { duration: 10000 },
                        );
                    }
                }
                toast.success("Piano importato. Verifica i pasti dal piano.");
            } else {
                toast.success("Piano creato. Aggiungi i pasti dalla scheda piano.");
            }
            router.push("/nutrition");
        });
    }

    const showFullOverlay = pending && (mode === "ai" || mode === "import");
    const overlayMessage =
        mode === "ai"
            ? "Generazione del piano alimentare in corso…"
            : "Importazione del piano dal documento…";

    return (
        <div className="space-y-4">
            {showFullOverlay && <GenerationOverlay message={overlayMessage} mode={mode} />}
            <div className="flex items-center gap-3">
                <Link href="/nutrition">
                    <Button variant="ghost" size="icon" className="text-slate-500">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                        Nuovo piano alimentare
                    </h1>
                    <p className="text-slate-500 mt-0.5 text-sm">
                        Crea un piano dettagliato manualmente, con AI o importando un
                        documento esistente.
                    </p>
                </div>
            </div>

            <form onSubmit={onSubmit} className="grid lg:grid-cols-3 gap-4">
                {/* Sidebar dati cliente + macros */}
                <aside className="lg:col-span-1 space-y-3 lg:sticky lg:top-4 self-start">
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardContent className="p-4 space-y-3">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                Cliente
                            </Label>
                            <ClientCombobox
                                clients={clients}
                                value={clientId}
                                onChange={setClientId}
                                placeholder="Seleziona cliente"
                            />
                            {loadingClient && (
                                <div className="text-xs text-slate-500">
                                    Carico dati cliente…
                                </div>
                            )}
                            {clientData && (
                                <ClientInfoBlock
                                    data={clientData}
                                    calc={calc}
                                    profileIncomplete={!!profileIncomplete}
                                    onEditProfile={() => setProfileDialogOpen(true)}
                                    onClientUpdated={reloadClient}
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Macros target */}
                    {clientData && (
                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                        Target giornalieri
                                    </Label>
                                    {calc?.macros && (
                                        <button
                                            type="button"
                                            onClick={applySuggestedMacros}
                                            className="text-[11px] brand-text font-semibold hover:underline"
                                        >
                                            Suggerisci
                                        </button>
                                    )}
                                </div>
                                {calc?.macrosAreEstimate ? (
                                    <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 leading-snug">
                                        Stimato per obiettivo. Completa profilo
                                        cliente (sesso, attività, peso, altezza) per
                                        un calcolo BMR/TDEE preciso.
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1.5 leading-snug">
                                        Calcolato dal profilo cliente
                                        (Mifflin-St Jeor × attività).
                                    </p>
                                )}
                                <Select
                                    value={obiettivo}
                                    onValueChange={(v) => setObiettivo(v as Obiettivo)}
                                >
                                    <SelectTrigger className="border-slate-200 shadow-none h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(OBIETTIVO_LABELS) as Obiettivo[]).map(
                                            (k) => (
                                                <SelectItem key={k} value={k}>
                                                    {OBIETTIVO_LABELS[k]}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                                <div className="grid grid-cols-2 gap-2">
                                    <SmallNumInput
                                        label="kcal"
                                        value={kcalTarget}
                                        onChange={setKcalTarget}
                                    />
                                    <SmallNumInput
                                        label="Proteine g"
                                        value={proteineG}
                                        onChange={setProteineG}
                                    />
                                    <SmallNumInput
                                        label="Carbo g"
                                        value={carboG}
                                        onChange={setCarboG}
                                    />
                                    <SmallNumInput
                                        label="Grassi g"
                                        value={grassiG}
                                        onChange={setGrassiG}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </aside>

                {/* Main */}
                <div className="lg:col-span-2 space-y-3">
                    {/* Mode tabs */}
                    <div className="flex gap-1 p-1 rounded-lg bg-slate-100">
                        <ModeTab
                            active={mode === "manual"}
                            icon={<Pencil size={14} />}
                            label="Manuale"
                            onClick={() => setMode("manual")}
                        />
                        <ModeTab
                            active={mode === "ai"}
                            icon={<Sparkles size={14} />}
                            label="Genera con AI"
                            onClick={() => setMode("ai")}
                        />
                        <ModeTab
                            active={mode === "import"}
                            icon={<Upload size={14} />}
                            label="Importa documento"
                            onClick={() => setMode("import")}
                        />
                    </div>

                    {/* Dettagli piano */}
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardContent className="p-4 space-y-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    Nome piano
                                </Label>
                                <Input
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    placeholder="Es. Definizione luglio"
                                    className="border-slate-200 shadow-none h-10"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-700">
                                        Data inizio
                                    </Label>
                                    <Input
                                        type="date"
                                        value={dataInizio}
                                        onChange={(e) => setDataInizio(e.target.value)}
                                        className="border-slate-200 shadow-none h-10"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-700">
                                        Data fine (opzionale)
                                    </Label>
                                    <Input
                                        type="date"
                                        value={dataFine}
                                        onChange={(e) => setDataFine(e.target.value)}
                                        className="border-slate-200 shadow-none h-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    Note (opzionali)
                                </Label>
                                <Textarea
                                    rows={2}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="border-slate-200 shadow-none"
                                />
                            </div>
                            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 cursor-pointer hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    checked={attivo}
                                    onChange={(e) => setAttivo(e.target.checked)}
                                    className="h-4 w-4 mt-0.5 accent-current brand-text"
                                />
                                <div>
                                    <div className="text-sm font-semibold text-slate-700">
                                        Attiva questo piano
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        Disattiva altri piani dello stesso cliente.
                                    </div>
                                </div>
                            </label>
                        </CardContent>
                    </Card>

                    {/* Mode-specific */}
                    {mode === "ai" && (
                        <Card className="bg-white border-2 brand-border shadow-sm">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="brand-text" />
                                    <span className="text-sm font-semibold brand-text">
                                        Parametri AI
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-600">
                                        Indicazioni aggiuntive per l&apos;AI (opzionali)
                                    </Label>
                                    <Textarea
                                        rows={3}
                                        value={aiPreferenze}
                                        onChange={(e) =>
                                            setAiPreferenze(e.target.value)
                                        }
                                        placeholder="Note specifiche oltre a quelle del profilo cliente. Es: 'pasti pronti il sabato', 'colazione veloce'…"
                                        className="border-slate-200 shadow-none bg-slate-50"
                                    />
                                </div>
                                {clientData?.profile && (
                                    <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                                        <div className="font-semibold text-slate-700 mb-1">
                                            L&apos;AI userà automaticamente dal profilo:
                                        </div>
                                        <div>
                                            • Obiettivo + macros target sopra
                                        </div>
                                        {clientData.profile.regime_alimentare && (
                                            <div>
                                                • Regime: {clientData.profile.regime_alimentare}
                                            </div>
                                        )}
                                        {clientData.profile.allergeni.length > 0 && (
                                            <div>
                                                • Allergeni:{" "}
                                                {clientData.profile.allergeni.join(", ")}
                                            </div>
                                        )}
                                        {clientData.profile.esclusioni_alimenti.length >
                                            0 && (
                                            <div>
                                                • Esclusioni:{" "}
                                                {clientData.profile.esclusioni_alimenti.join(
                                                    ", ",
                                                )}
                                            </div>
                                        )}
                                        {clientData.profile.preferenze_alimenti.length >
                                            0 && (
                                            <div>
                                                • Preferenze:{" "}
                                                {clientData.profile.preferenze_alimenti.join(
                                                    ", ",
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <p className="text-xs text-slate-500">
                                    Tempo stimato: 10-15 secondi.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {mode === "import" && (
                        <Card className="bg-white border-2 brand-border shadow-sm">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Upload size={16} className="brand-text" />
                                    <span className="text-sm font-semibold brand-text">
                                        Importa da PDF o foto
                                    </span>
                                </div>
                                <input
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/png,image/webp"
                                    onChange={(e) =>
                                        setImportFile(e.target.files?.[0] ?? null)
                                    }
                                    className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-200 hover:file:bg-slate-300 file:cursor-pointer"
                                />
                                {importFile && (
                                    <div className="text-xs text-slate-500">
                                        {importFile.name} ·{" "}
                                        {(importFile.size / 1024).toFixed(0)} KB
                                    </div>
                                )}
                                <p className="text-xs text-slate-500">
                                    Formati supportati: <strong>PDF, JPG, PNG, WEBP</strong> (max 10MB). L&apos;AI estrae i pasti e li digitalizza — verifica sempre il risultato prima di assegnarlo.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex justify-end gap-2">
                        <Link href="/nutrition">
                            <Button
                                type="button"
                                variant="outline"
                                className="border-slate-200"
                            >
                                Annulla
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            disabled={pending || !clientId}
                            className="brand-bg text-white px-6"
                        >
                            {pending
                                ? mode === "ai"
                                    ? "Genero…"
                                    : mode === "import"
                                      ? "Importo…"
                                      : "Creo…"
                                : mode === "ai"
                                  ? "Crea e genera con AI"
                                  : mode === "import"
                                    ? "Crea e importa"
                                    : "Crea piano"}
                        </Button>
                    </div>
                </div>
            </form>

            {clientId && clientData && (
                <NutritionProfileDialog
                    clientId={parseInt(clientId, 10)}
                    clientLabel={`${clientData.client.nome} ${clientData.client.cognome}`}
                    open={profileDialogOpen}
                    onOpenChange={setProfileDialogOpen}
                    onSaved={() => reloadClient()}
                />
            )}
        </div>
    );
}

// ─── Sotto-componenti ─────────────────────────────────────────────

function ClientInfoBlock({
    data,
    calc,
    profileIncomplete,
    onEditProfile,
    onClientUpdated,
}: {
    data: ClientNutritionFullData;
    calc: {
        eta: number | null;
        bmr: number | null;
        tdee: number | null;
        bmi: number | null;
        macros: { kcal: number; proteine_g: number; carbo_g: number; grassi_g: number } | null;
    } | null;
    profileIncomplete: boolean;
    onEditProfile: () => void;
    onClientUpdated: () => void;
}) {
    const sessoIcon =
        data.profile?.sesso === "M" ? "♂" : data.profile?.sesso === "F" ? "♀" : "•";
    const measurementsMissing =
        data.derived.pesoKg == null || data.derived.altezzaCm == null;
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center brand-text font-bold">
                    {initials(data.client.nome, data.client.cognome)}
                </div>
                <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">
                        {data.client.nome} {data.client.cognome}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                        <span>{sessoIcon}</span>
                        {calc?.eta != null && <span>· {calc.eta}a</span>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Stat label="Peso" value={data.derived.pesoKg ? `${data.derived.pesoKg}kg` : "—"} />
                <Stat
                    label="Altezza"
                    value={data.derived.altezzaCm ? `${data.derived.altezzaCm}cm` : "—"}
                />
                <Stat label="BMI" value={calc?.bmi ? String(calc.bmi) : "—"} />
            </div>

            {measurementsMissing && (
                <MeasurementsAlert
                    clientId={data.client.id}
                    pesoMissing={data.derived.pesoKg == null}
                    altezzaMissing={data.derived.altezzaCm == null}
                    onSaved={onClientUpdated}
                />
            )}

            {calc?.bmr && calc?.tdee && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Flame size={11} className="text-orange-500" />
                        BMR (Mifflin-St Jeor): <strong>{calc.bmr} kcal</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Flame size={11} className="text-orange-500" />
                        TDEE: <strong>{calc.tdee} kcal</strong>
                    </div>
                </div>
            )}

            {profileIncomplete ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
                    <div className="flex items-start gap-2 text-xs text-amber-800">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <div>
                            Profilo incompleto. Mancano sesso/attività/allergeni: il piano
                            sarà meno preciso.
                        </div>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onEditProfile}
                        className="border-amber-300 bg-white text-amber-800 h-7 w-full text-xs"
                    >
                        Completa profilo
                    </Button>
                </div>
            ) : (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onEditProfile}
                    className="border-slate-200 h-7 w-full text-xs"
                >
                    <Pencil size={11} className="mr-1.5" />
                    Modifica profilo
                </Button>
            )}

            {data.profile && (
                <div className="space-y-2 pt-1">
                    {data.profile.livello_attivita && (
                        <div className="text-[11px] text-slate-500">
                            Attività:{" "}
                            <span className="font-medium text-slate-700">
                                {ACTIVITY_LABELS[data.profile.livello_attivita]}
                            </span>
                        </div>
                    )}
                    {data.profile.regime_alimentare && (
                        <Badge
                            variant="outline"
                            className="bg-emerald-50 border-emerald-200 text-emerald-700 text-[10px]"
                        >
                            🌱 {data.profile.regime_alimentare}
                        </Badge>
                    )}
                    {data.profile.allergeni.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {data.profile.allergeni.map((a) => (
                                <Badge
                                    key={a}
                                    variant="outline"
                                    className="bg-rose-50 border-rose-200 text-rose-700 text-[10px]"
                                >
                                    🛑 {a}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md bg-slate-50 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                {label}
            </div>
            <div className="text-sm font-bold text-slate-900 tabular-nums">{value}</div>
        </div>
    );
}

function SmallNumInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                {label}
            </div>
            <Input
                type="number"
                min="0"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="border-slate-200 shadow-none h-9 text-sm tabular-nums"
            />
        </div>
    );
}

function ModeTab({
    active,
    icon,
    label,
    onClick,
}: {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                active
                    ? "bg-white shadow-sm brand-text"
                    : "text-slate-600 hover:text-slate-900"
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────

function initials(nome: string, cognome: string): string {
    return `${(nome[0] ?? "?").toUpperCase()}${(cognome[0] ?? "").toUpperCase()}`;
}

function deriveAge(dataNascita: string | null): number | null {
    if (!dataNascita) return null;
    const d = new Date(dataNascita);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
}

function buildAiPreferences(
    profile:
        | {
              regime_alimentare: string | null;
              allergeni: string[];
              intolleranze: string | null;
              preferenze_alimenti: string[];
              esclusioni_alimenti: string[];
              note_aggiuntive: string | null;
          }
        | null
        | undefined,
    userText: string,
): string {
    const parts: string[] = [];
    if (profile?.regime_alimentare) {
        parts.push(`Regime alimentare: ${profile.regime_alimentare}.`);
    }
    if (profile?.allergeni && profile.allergeni.length > 0) {
        parts.push(
            `ALLERGENI da escludere assolutamente: ${profile.allergeni.join(", ")}.`,
        );
    }
    if (profile?.intolleranze) {
        parts.push(`Intolleranze: ${profile.intolleranze}.`);
    }
    if (profile?.esclusioni_alimenti && profile.esclusioni_alimenti.length > 0) {
        parts.push(
            `Alimenti non graditi (escludere): ${profile.esclusioni_alimenti.join(", ")}.`,
        );
    }
    if (profile?.preferenze_alimenti && profile.preferenze_alimenti.length > 0) {
        parts.push(
            `Alimenti graditi (preferire quando sensato): ${profile.preferenze_alimenti.join(", ")}.`,
        );
    }
    if (profile?.note_aggiuntive) {
        parts.push(`Note: ${profile.note_aggiuntive}.`);
    }
    if (userText.trim()) {
        parts.push(userText.trim());
    }
    return parts.join(" ");
}

function MeasurementsAlert({
    clientId,
    pesoMissing,
    altezzaMissing,
    onSaved,
}: {
    clientId: number;
    pesoMissing: boolean;
    altezzaMissing: boolean;
    onSaved: () => void;
}) {
    const [peso, setPeso] = useState("");
    const [altezza, setAltezza] = useState("");
    const [saving, setSaving] = useState(false);

    async function save() {
        const payload: { peso?: string; altezza?: string } = {};
        if (pesoMissing && peso.trim()) payload.peso = peso.trim();
        if (altezzaMissing && altezza.trim()) payload.altezza = altezza.trim();
        if (Object.keys(payload).length === 0) {
            toast.error("Inserisci almeno un valore");
            return;
        }
        setSaving(true);
        try {
            const r = await updateClient(clientId, payload);
            if (r.success) {
                toast.success("Dati cliente salvati");
                onSaved();
            } else {
                toast.error("Errore salvataggio");
            }
        } finally {
            setSaving(false);
        }
    }

    const missingLabels: string[] = [];
    if (pesoMissing) missingLabels.push("peso");
    if (altezzaMissing) missingLabels.push("altezza");

    return (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2.5">
            <div className="flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <div>
                    Mancano <strong>{missingLabels.join(" e ")}</strong>. Senza
                    questi dati BMR/TDEE e i target macros non possono essere
                    calcolati.
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {pesoMissing && (
                    <div>
                        <div className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-1">
                            Peso (kg)
                        </div>
                        <Input
                            type="number"
                            step="0.1"
                            min="20"
                            max="300"
                            placeholder="78"
                            value={peso}
                            onChange={(e) => setPeso(e.target.value)}
                            className="h-9 bg-white border-amber-300 shadow-none text-sm"
                        />
                    </div>
                )}
                {altezzaMissing && (
                    <div>
                        <div className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-1">
                            Altezza (cm)
                        </div>
                        <Input
                            type="number"
                            min="100"
                            max="240"
                            placeholder="175"
                            value={altezza}
                            onChange={(e) => setAltezza(e.target.value)}
                            className="h-9 bg-white border-amber-300 shadow-none text-sm"
                        />
                    </div>
                )}
            </div>
            <Button
                type="button"
                size="sm"
                onClick={save}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white h-8 w-full text-xs"
            >
                {saving ? "Salvo…" : "Salva dati cliente"}
            </Button>
        </div>
    );
}

function GenerationOverlay({
    message,
    mode,
}: {
    message: string;
    mode: "ai" | "import" | "manual";
}) {
    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-4">
                <div className="relative h-16 w-16 mx-auto">
                    <div className="absolute inset-0 rounded-full brand-bg opacity-20 animate-ping" />
                    <div className="relative h-16 w-16 rounded-full brand-bg flex items-center justify-center">
                        {mode === "ai" ? (
                            <Sparkles size={28} className="text-white" />
                        ) : (
                            <Upload size={28} className="text-white" />
                        )}
                    </div>
                </div>
                <div>
                    <div className="text-lg font-bold text-slate-900">{message}</div>
                    <p className="text-sm text-slate-500 mt-2">
                        Stiamo costruendo 7 giorni × pasti con alimenti e
                        alternative. Può richiedere 15-30 secondi.
                    </p>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                    <div className="h-2 w-2 rounded-full brand-bg animate-bounce" />
                    <div
                        className="h-2 w-2 rounded-full brand-bg animate-bounce"
                        style={{ animationDelay: "150ms" }}
                    />
                    <div
                        className="h-2 w-2 rounded-full brand-bg animate-bounce"
                        style={{ animationDelay: "300ms" }}
                    />
                </div>
                <p className="text-[11px] text-slate-400 italic">
                    Non chiudere o ricaricare la pagina.
                </p>
            </div>
        </div>
    );
}
