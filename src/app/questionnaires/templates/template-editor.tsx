"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    FileText,
    Pencil,
} from "lucide-react";
import { createTemplate, updateTemplate } from "@/lib/actions/questionnaires";

type QuestionType =
    | "text"
    | "textarea"
    | "number"
    | "radio"
    | "checkbox"
    | "scale"
    | "upload"
    | "confirm";

interface QuestionDraft {
    id: string;
    type: QuestionType;
    label: string;
    hint?: string;
    required: boolean;
    options?: string[];
    min?: number;
    max?: number;
}

interface SectionDraft {
    id: string;
    title: string;
    question_ids: string[];
}

const TYPE_LABELS: Record<QuestionType, string> = {
    text: "Testo breve",
    textarea: "Testo lungo",
    number: "Numero",
    radio: "Scelta singola",
    checkbox: "Scelta multipla",
    scale: "Scala 1-10",
    upload: "Allegato (foto/file)",
    confirm: "Conferma 'Ho capito'",
};

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40) || `q_${Date.now()}`;
}

export default function TemplateEditor({
    mode,
    template,
}: {
    mode: "create" | "edit";
    template?: {
        id: number;
        nome: string;
        tipo: string;
        descrizione: string | null;
        schema_json: unknown;
    };
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const initialSchema = (template?.schema_json ?? {}) as {
        questions?: QuestionDraft[];
        sections?: SectionDraft[];
    };

    const [nome, setNome] = useState(template?.nome ?? "");
    const [tipo, setTipo] = useState(template?.tipo ?? "generico");
    const [descrizione, setDescrizione] = useState(template?.descrizione ?? "");
    const [questions, setQuestions] = useState<QuestionDraft[]>(
        (initialSchema.questions ?? []).map((q) => ({
            id: q.id,
            type: q.type as QuestionType,
            label: q.label,
            hint: q.hint,
            required: !!q.required,
            options: q.options,
            min: q.min,
            max: q.max,
        }))
    );
    const [sections, setSections] = useState<SectionDraft[]>(
        initialSchema.sections ?? []
    );
    const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(
        null
    );
    const [editingSectionIdx, setEditingSectionIdx] = useState<number | null>(
        null
    );

    const orphanedQids = useMemo(() => {
        if (sections.length === 0) return questions.map((q) => q.id);
        const inSections = new Set(sections.flatMap((s) => s.question_ids));
        return questions.filter((q) => !inSections.has(q.id)).map((q) => q.id);
    }, [questions, sections]);

    function newQuestionId(label: string, existing: string[]): string {
        let base = slugify(label);
        if (!existing.includes(base)) return base;
        let i = 2;
        while (existing.includes(`${base}_${i}`)) i++;
        return `${base}_${i}`;
    }

    function addQuestion(type: QuestionType) {
        const id = `q_${Date.now()}`;
        const q: QuestionDraft = {
            id,
            type,
            label: "Nuova domanda",
            required: false,
            ...(type === "radio" || type === "checkbox"
                ? { options: ["Opzione 1", "Opzione 2"] }
                : {}),
            ...(type === "scale" ? { min: 1, max: 10 } : {}),
        };
        setQuestions((prev) => [...prev, q]);
        setEditingQuestionIdx(questions.length);
    }

    function updateQuestion(idx: number, patch: Partial<QuestionDraft>) {
        setQuestions((prev) =>
            prev.map((q, i) => (i === idx ? { ...q, ...patch } : q))
        );
    }

    function removeQuestion(idx: number) {
        const removed = questions[idx];
        setQuestions((prev) => prev.filter((_, i) => i !== idx));
        // Rimuovi anche dai riferimenti nelle sezioni
        setSections((prev) =>
            prev.map((s) => ({
                ...s,
                question_ids: s.question_ids.filter((id) => id !== removed.id),
            }))
        );
    }

    function moveQuestion(idx: number, dir: -1 | 1) {
        const next = idx + dir;
        if (next < 0 || next >= questions.length) return;
        setQuestions((prev) => {
            const arr = [...prev];
            [arr[idx], arr[next]] = [arr[next], arr[idx]];
            return arr;
        });
    }

    function addSection() {
        const id = `sec_${Date.now()}`;
        setSections((prev) => [
            ...prev,
            { id, title: "Nuova sezione", question_ids: [] },
        ]);
        setEditingSectionIdx(sections.length);
    }

    function updateSection(idx: number, patch: Partial<SectionDraft>) {
        setSections((prev) =>
            prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
        );
    }

    function removeSection(idx: number) {
        setSections((prev) => prev.filter((_, i) => i !== idx));
    }

    function moveSection(idx: number, dir: -1 | 1) {
        const next = idx + dir;
        if (next < 0 || next >= sections.length) return;
        setSections((prev) => {
            const arr = [...prev];
            [arr[idx], arr[next]] = [arr[next], arr[idx]];
            return arr;
        });
    }

    function toggleQuestionInSection(secIdx: number, qid: string) {
        setSections((prev) => {
            // Rimuovi qid da TUTTE le sezioni (una domanda sta in una sola sezione)
            const cleaned = prev.map((s) => ({
                ...s,
                question_ids: s.question_ids.filter((x) => x !== qid),
            }));
            // Aggiungi a quella selezionata
            cleaned[secIdx] = {
                ...cleaned[secIdx],
                question_ids: [...cleaned[secIdx].question_ids, qid],
            };
            return cleaned;
        });
    }

    function onSubmit() {
        if (!nome.trim()) {
            toast.error("Nome del template obbligatorio");
            return;
        }
        if (questions.length === 0) {
            toast.error("Aggiungi almeno una domanda");
            return;
        }
        // Normalizza ID basati su slug del label per template puliti
        const idMap = new Map<string, string>();
        const usedIds: string[] = [];
        const normalized: QuestionDraft[] = questions.map((q) => {
            // Se l'id è del tipo q_<timestamp> (auto), rigeneralo dal label
            let finalId = q.id;
            if (/^q_\d+$/.test(q.id)) {
                finalId = newQuestionId(q.label, usedIds);
            }
            usedIds.push(finalId);
            idMap.set(q.id, finalId);
            return { ...q, id: finalId };
        });
        const remappedSections = sections.map((s) => ({
            ...s,
            question_ids: s.question_ids.map((x) => idMap.get(x) ?? x),
        }));

        const schema = {
            questions: normalized,
            sections: remappedSections.length > 0 ? remappedSections : undefined,
        };

        startTransition(async () => {
            if (mode === "create") {
                const r = await createTemplate({
                    nome,
                    tipo,
                    descrizione: descrizione || null,
                    schema,
                });
                if (r.success) {
                    toast.success("Template creato");
                    router.push("/questionnaires");
                } else {
                    toast.error(r.error || "Errore");
                }
            } else {
                const r = await updateTemplate(template!.id, {
                    nome,
                    tipo,
                    descrizione: descrizione || null,
                    schema,
                });
                if (r.success) {
                    toast.success("Template aggiornato");
                    router.push("/questionnaires");
                } else {
                    toast.error(r.error || "Errore");
                }
            }
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/questionnaires">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-slate-500 hover:text-slate-900"
                        >
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">
                            {mode === "create"
                                ? "Nuovo template"
                                : "Modifica template"}
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {questions.length} domande
                            {sections.length > 0 && ` · ${sections.length} sezioni`}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={onSubmit}
                    disabled={pending}
                    className="brand-bg text-white gap-2 shadow-lg px-6 h-11 w-full sm:w-auto"
                >
                    <Save size={16} />
                    {pending ? "Salvo…" : mode === "create" ? "Crea" : "Salva"}
                </Button>
            </div>

            {/* Metadati */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                Nome del template *
                            </Label>
                            <Input
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Es. CHECK RINNOVO"
                                className="border-slate-200 shadow-none h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                Tipo
                            </Label>
                            <Select value={tipo} onValueChange={setTipo}>
                                <SelectTrigger className="border-slate-200 shadow-none h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="generico">Generico</SelectItem>
                                    <SelectItem value="check_rinnovo">
                                        Check rinnovo
                                    </SelectItem>
                                    <SelectItem value="salute_nutrizione">
                                        Salute & nutrizione
                                    </SelectItem>
                                    <SelectItem value="anamnesi">Anamnesi</SelectItem>
                                    <SelectItem value="feedback">Feedback</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Descrizione (opzionale)
                        </Label>
                        <Textarea
                            value={descrizione}
                            onChange={(e) => setDescrizione(e.target.value)}
                            rows={2}
                            placeholder="Spiega ai clienti perché lo stai inviando"
                            className="border-slate-200 shadow-none"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Sezioni */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Sezioni
                            </h2>
                            <p className="text-xs text-slate-500">
                                Opzionale. Raggruppa domande per tema (es. Salute,
                                Pasti, Bevande).
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={addSection}
                            className="border-slate-200 gap-1.5 h-8"
                        >
                            <Plus size={13} />
                            Sezione
                        </Button>
                    </div>
                    {sections.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">
                            Nessuna sezione: le domande verranno mostrate in elenco
                            piatto.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {sections.map((s, i) => (
                                <div
                                    key={s.id}
                                    className="rounded-lg border border-slate-200 bg-slate-50/40 p-3 flex items-center gap-2"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            type="button"
                                            disabled={i === 0}
                                            onClick={() => moveSection(i, -1)}
                                            className="disabled:opacity-30 hover:bg-white rounded p-0.5"
                                        >
                                            <ChevronUp size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={i === sections.length - 1}
                                            onClick={() => moveSection(i, 1)}
                                            className="disabled:opacity-30 hover:bg-white rounded p-0.5"
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-sm text-slate-900 truncate">
                                            {s.title}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {s.question_ids.length} domande
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingSectionIdx(i)}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Pencil size={13} />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeSection(i)}
                                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                                    >
                                        <Trash2 size={13} />
                                    </Button>
                                </div>
                            ))}
                            {orphanedQids.length > 0 && (
                                <p className="text-xs text-amber-600 italic mt-2">
                                    ⚠ {orphanedQids.length} domande non assegnate ad
                                    alcuna sezione (verranno mostrate in fondo)
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Domande */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Domande
                            </h2>
                            <p className="text-xs text-slate-500">
                                Aggiungi le domande del questionario.
                            </p>
                        </div>
                        <Select
                            onValueChange={(v) => addQuestion(v as QuestionType)}
                        >
                            <SelectTrigger className="w-[180px] border-slate-200 shadow-none h-9">
                                <SelectValue placeholder="+ Aggiungi domanda" />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(TYPE_LABELS) as QuestionType[]).map(
                                    (t) => (
                                        <SelectItem key={t} value={t}>
                                            {TYPE_LABELS[t]}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    {questions.length === 0 ? (
                        <div className="text-center py-12 text-sm text-slate-400">
                            <FileText
                                size={36}
                                className="mx-auto mb-2 opacity-30"
                            />
                            Nessuna domanda. Aggiungine una dal menu in alto.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {questions.map((q, i) => (
                                <div
                                    key={q.id}
                                    className="rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-2"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            type="button"
                                            disabled={i === 0}
                                            onClick={() => moveQuestion(i, -1)}
                                            className="disabled:opacity-30 hover:bg-slate-100 rounded p-0.5"
                                        >
                                            <ChevronUp size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={i === questions.length - 1}
                                            onClick={() => moveQuestion(i, 1)}
                                            className="disabled:opacity-30 hover:bg-slate-100 rounded p-0.5"
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium text-sm text-slate-900 truncate">
                                            {q.label || (
                                                <span className="italic text-slate-400">
                                                    (senza titolo)
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] brand-text brand-border"
                                            >
                                                {TYPE_LABELS[q.type]}
                                            </Badge>
                                            {q.required && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] bg-rose-50 text-rose-700 border-rose-200"
                                                >
                                                    Obbligatoria
                                                </Badge>
                                            )}
                                            {q.options && q.options.length > 0 && (
                                                <span className="text-[10px] text-slate-400">
                                                    {q.options.length} opzioni
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingQuestionIdx(i)}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Pencil size={13} />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeQuestion(i)}
                                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                                    >
                                        <Trash2 size={13} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {editingQuestionIdx !== null && (
                <QuestionEditorDialog
                    question={questions[editingQuestionIdx]}
                    onClose={() => setEditingQuestionIdx(null)}
                    onSave={(updated) => {
                        updateQuestion(editingQuestionIdx, updated);
                        setEditingQuestionIdx(null);
                    }}
                />
            )}

            {editingSectionIdx !== null && (
                <SectionEditorDialog
                    section={sections[editingSectionIdx]}
                    allQuestions={questions}
                    sections={sections}
                    sectionIdx={editingSectionIdx}
                    onClose={() => setEditingSectionIdx(null)}
                    onUpdate={(patch) => updateSection(editingSectionIdx, patch)}
                    onToggleQuestion={(qid) =>
                        toggleQuestionInSection(editingSectionIdx, qid)
                    }
                />
            )}
        </div>
    );
}

function QuestionEditorDialog({
    question,
    onClose,
    onSave,
}: {
    question: QuestionDraft;
    onClose: () => void;
    onSave: (q: QuestionDraft) => void;
}) {
    const [draft, setDraft] = useState<QuestionDraft>({ ...question });
    const isChoice = draft.type === "radio" || draft.type === "checkbox";
    const isScale = draft.type === "scale";

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg text-slate-900">
                        Modifica domanda
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Tipo
                        </Label>
                        <Select
                            value={draft.type}
                            onValueChange={(v) =>
                                setDraft((p) => ({
                                    ...p,
                                    type: v as QuestionType,
                                    options:
                                        v === "radio" || v === "checkbox"
                                            ? p.options ?? ["Opzione 1", "Opzione 2"]
                                            : undefined,
                                    min: v === "scale" ? p.min ?? 1 : undefined,
                                    max: v === "scale" ? p.max ?? 10 : undefined,
                                }))
                            }
                        >
                            <SelectTrigger className="border-slate-200 shadow-none h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(TYPE_LABELS) as QuestionType[]).map(
                                    (t) => (
                                        <SelectItem key={t} value={t}>
                                            {TYPE_LABELS[t]}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Testo della domanda *
                        </Label>
                        <Textarea
                            value={draft.label}
                            onChange={(e) =>
                                setDraft((p) => ({ ...p, label: e.target.value }))
                            }
                            rows={2}
                            placeholder="Es. Hai allergie o intolleranze?"
                            className="border-slate-200 shadow-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Hint / aiuto (opzionale)
                        </Label>
                        <Input
                            value={draft.hint ?? ""}
                            onChange={(e) =>
                                setDraft((p) => ({ ...p, hint: e.target.value }))
                            }
                            placeholder="Es. Se sì, elenca gravità ed effetti"
                            className="border-slate-200 shadow-none h-10"
                        />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={draft.required}
                            onChange={(e) =>
                                setDraft((p) => ({
                                    ...p,
                                    required: e.target.checked,
                                }))
                            }
                            className="h-4 w-4 accent-current brand-text"
                        />
                        <span className="text-sm text-slate-700">
                            Risposta obbligatoria
                        </span>
                    </label>
                    {isChoice && (
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                Opzioni (una per riga)
                            </Label>
                            <Textarea
                                value={(draft.options ?? []).join("\n")}
                                onChange={(e) =>
                                    setDraft((p) => ({
                                        ...p,
                                        options: e.target.value
                                            .split("\n")
                                            .map((s) => s.trim())
                                            .filter((s) => s.length > 0),
                                    }))
                                }
                                rows={4}
                                placeholder="Opzione 1&#10;Opzione 2&#10;Opzione 3"
                                className="border-slate-200 shadow-none font-mono text-sm"
                            />
                        </div>
                    )}
                    {isScale && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    Min
                                </Label>
                                <Input
                                    type="number"
                                    value={draft.min ?? 1}
                                    onChange={(e) =>
                                        setDraft((p) => ({
                                            ...p,
                                            min: parseInt(e.target.value, 10),
                                        }))
                                    }
                                    className="border-slate-200 shadow-none h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">
                                    Max
                                </Label>
                                <Input
                                    type="number"
                                    value={draft.max ?? 10}
                                    onChange={(e) =>
                                        setDraft((p) => ({
                                            ...p,
                                            max: parseInt(e.target.value, 10),
                                        }))
                                    }
                                    className="border-slate-200 shadow-none h-10"
                                />
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-slate-200"
                    >
                        Annulla
                    </Button>
                    <Button
                        onClick={() => onSave(draft)}
                        className="brand-bg text-white gap-2"
                    >
                        <Save size={14} />
                        Salva
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SectionEditorDialog({
    section,
    allQuestions,
    sections,
    sectionIdx,
    onClose,
    onUpdate,
    onToggleQuestion,
}: {
    section: SectionDraft;
    allQuestions: QuestionDraft[];
    sections: SectionDraft[];
    sectionIdx: number;
    onClose: () => void;
    onUpdate: (patch: Partial<SectionDraft>) => void;
    onToggleQuestion: (qid: string) => void;
}) {
    // Calcolo le domande già appartenenti ad altre sezioni
    const otherSectionsQids = new Set(
        sections.flatMap((s, i) =>
            i === sectionIdx ? [] : s.question_ids
        )
    );

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg text-slate-900">
                        Modifica sezione
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Titolo
                        </Label>
                        <Input
                            value={section.title}
                            onChange={(e) =>
                                onUpdate({ title: e.target.value })
                            }
                            placeholder="Es. Salute"
                            className="border-slate-200 shadow-none h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Domande in questa sezione
                        </Label>
                        <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                            {allQuestions.length === 0 ? (
                                <p className="p-4 text-sm text-slate-400 text-center">
                                    Aggiungi prima le domande
                                </p>
                            ) : (
                                allQuestions.map((q) => {
                                    const inThis = section.question_ids.includes(
                                        q.id
                                    );
                                    const inOther = otherSectionsQids.has(q.id);
                                    return (
                                        <label
                                            key={q.id}
                                            className={`flex items-start gap-3 px-3 py-2 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50 ${
                                                inOther && !inThis
                                                    ? "opacity-50"
                                                    : ""
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={inThis}
                                                onChange={() =>
                                                    onToggleQuestion(q.id)
                                                }
                                                disabled={inOther && !inThis}
                                                className="h-4 w-4 mt-0.5 accent-current brand-text"
                                            />
                                            <div className="min-w-0">
                                                <div className="text-sm text-slate-900">
                                                    {q.label}
                                                </div>
                                                {inOther && !inThis && (
                                                    <div className="text-[10px] text-slate-400 italic">
                                                        Già in un&apos;altra sezione
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button
                        onClick={onClose}
                        className="brand-bg text-white"
                    >
                        Fatto
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
