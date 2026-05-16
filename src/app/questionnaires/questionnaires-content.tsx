"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Pagination } from "@/components/ui/pagination";

const DEFAULT_PAGE_SIZE = 10;
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    ClipboardList,
    Send,
    Trash2,
    Eye,
    UserRound,
    Calendar,
    FileText,
    CheckCircle2,
    Clock,
    Plus,
    Pencil,
    Search,
    ChevronDown,
} from "lucide-react";
import {
    assignTemplateToClients,
    deleteAssignment,
    deleteTemplate,
    getAssignmentDetail,
} from "@/lib/actions/questionnaires";

type Template = {
    id: number;
    nome: string;
    tipo: string;
    descrizione: string | null;
    schema_json: unknown;
    is_active: boolean;
};

type ClientLite = {
    id: number;
    nome: string;
    cognome: string;
};

type AssignmentRow = {
    id: number;
    template_id: number;
    template_nome: string | null;
    template_tipo: string | null;
    client_id: number;
    client_nome: string | null;
    client_cognome: string | null;
    status: string;
    motivo: string | null;
    sent_at: Date | string;
    completed_at: Date | string | null;
};

function formatDate(d: Date | string): string {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function QuestionnairesContent({
    templates,
    clientsList,
    assignments,
}: {
    templates: Template[];
    clientsList: ClientLite[];
    assignments: AssignmentRow[];
}) {
    const [assignDialog, setAssignDialog] = useState<Template | null>(null);
    const [detailId, setDetailId] = useState<number | null>(null);

    const pending = assignments.filter((a) => a.status === "pending");
    const completed = assignments.filter((a) => a.status === "completed");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Questionari
                </h1>
                <p className="text-slate-500 mt-1">
                    Gestisci template di questionari, assegnali ai clienti e leggi le
                    risposte.
                </p>
            </div>

            <Tabs defaultValue="completed">
                <TabsList className="bg-slate-100 p-1 h-10">
                    <TabsTrigger
                        value="completed"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                    >
                        <CheckCircle2 size={14} /> Risposte
                        {completed.length > 0 && (
                            <Badge className="brand-bg text-white h-5 px-1.5 text-[10px] ml-1">
                                {completed.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger
                        value="pending"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                    >
                        <Clock size={14} /> In attesa
                        {pending.length > 0 && (
                            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px]">
                                {pending.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger
                        value="templates"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:brand-text gap-1.5"
                    >
                        <FileText size={14} /> Template
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="completed" className="mt-4">
                    <AssignmentList
                        items={completed}
                        emptyText="Nessuna risposta ricevuta ancora."
                        onSelect={setDetailId}
                    />
                </TabsContent>
                <TabsContent value="pending" className="mt-4">
                    <AssignmentList
                        items={pending}
                        emptyText="Nessun questionario in attesa di risposta."
                        onSelect={setDetailId}
                    />
                </TabsContent>
                <TabsContent value="templates" className="mt-4">
                    <TemplatesList
                        templates={templates}
                        onAssign={(t) => setAssignDialog(t)}
                    />
                </TabsContent>
            </Tabs>

            {assignDialog && (
                <AssignDialog
                    template={assignDialog}
                    clients={clientsList}
                    onClose={() => setAssignDialog(null)}
                    onAssigned={() => window.location.reload()}
                />
            )}

            {detailId && (
                <ResponseDetailDialog
                    assignmentId={detailId}
                    onClose={() => setDetailId(null)}
                />
            )}
        </div>
    );
}

function TemplatesList({
    templates,
    onAssign,
}: {
    templates: Template[];
    onAssign: (t: Template) => void;
}) {
    const [pending] = useTransition();
    const [search, setSearch] = useState("");
    const [tipoFilter, setTipoFilter] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const tipi = useMemo(() => {
        const set = new Set(templates.map((t) => t.tipo).filter(Boolean));
        return Array.from(set);
    }, [templates]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return templates.filter((t) => {
            if (tipoFilter !== "all" && t.tipo !== tipoFilter) return false;
            if (!q) return true;
            const haystack = `${t.nome} ${t.descrizione ?? ""}`.toLowerCase();
            return haystack.includes(q);
        });
    }, [templates, search, tipoFilter]);

    const filtersKey = `${search}|${tipoFilter}`;
    const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
    if (prevFiltersKey !== filtersKey) {
        setPage(1);
        setPrevFiltersKey(filtersKey);
    }

    const pagedTemplates = useMemo(
        () => filtered.slice((page - 1) * pageSize, page * pageSize),
        [filtered, page, pageSize],
    );

    async function handleDelete(t: Template) {
        const r = await deleteTemplate(t.id);
        if (r.success) {
            toast.success("Template eliminato");
            window.location.reload();
        } else toast.error(r.error || "Errore");
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Cerca template per nome o descrizione…"
                        className="pl-9 border-slate-200 shadow-none h-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {tipi.length > 1 && (
                    <Select value={tipoFilter} onValueChange={setTipoFilter}>
                        <SelectTrigger className="w-full sm:w-[180px] border-slate-200 shadow-none h-10">
                            <SelectValue placeholder="Tutti i tipi" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tutti i tipi</SelectItem>
                            {tipi.map((t) => (
                                <SelectItem key={t} value={t}>
                                    {t}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <Link href="/questionnaires/templates/new">
                    <Button className="brand-bg text-white gap-2 shadow-lg w-full sm:w-auto">
                        <Plus size={16} />
                        Nuovo template
                    </Button>
                </Link>
            </div>
            {templates.length === 0 ? (
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                        <FileText
                            className="mx-auto text-slate-300"
                            size={48}
                            strokeWidth={1.5}
                        />
                        <p className="mt-4 text-slate-700 font-semibold">
                            Nessun template
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            Crea il tuo primo template dal pulsante &quot;Nuovo template&quot;.
                        </p>
                    </CardContent>
                </Card>
            ) : filtered.length === 0 ? (
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="py-8 text-center text-sm text-slate-500">
                        Nessun template trovato con i filtri attuali.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {pagedTemplates.map((t) => {
                        const schema = t.schema_json as {
                            questions?: { id: string }[];
                            sections?: { id: string }[];
                        };
                        const nQuestions = schema?.questions?.length ?? 0;
                        const nSections = schema?.sections?.length ?? 0;
                        return (
                            <Card
                                key={t.id}
                                className="bg-white border-slate-200 shadow-sm overflow-hidden"
                            >
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="font-semibold text-slate-900 truncate">
                                                {t.nome}
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className="mt-1 brand-border brand-text text-[10px] font-bold"
                                            >
                                                {t.tipo.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                    {t.descrizione && (
                                        <p className="text-xs text-slate-500 line-clamp-3">
                                            {t.descrizione}
                                        </p>
                                    )}
                                    <div className="text-xs text-slate-400 flex items-center gap-2">
                                        <span>{nQuestions} domande</span>
                                        {nSections > 0 && (
                                            <>
                                                <span className="text-slate-300">·</span>
                                                <span>{nSections} sezioni</span>
                                            </>
                                        )}
                                    </div>
                                    <Button
                                        className="brand-bg text-white w-full gap-1.5"
                                        onClick={() => onAssign(t)}
                                    >
                                        <Send size={14} />
                                        Assegna ai clienti
                                    </Button>
                                    <div className="flex items-center gap-1 -mt-1">
                                        <Link
                                            href={`/questionnaires/templates/${t.id}`}
                                            className="flex-1"
                                        >
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full border-slate-200 h-8 gap-1.5"
                                            >
                                                <Pencil size={12} />
                                                Modifica
                                            </Button>
                                        </Link>
                                        <ConfirmDeleteDialog
                                            title={`Eliminare il template "${t.nome}"?`}
                                            description="Tutti gli assignment basati su questo template manterranno la copia dei dati ma non sarà più possibile crearne di nuovi."
                                            onConfirm={() => handleDelete(t)}
                                            trigger={
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={pending}
                                                    className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                                                >
                                                    <Trash2 size={13} />
                                                </Button>
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
            <Pagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(1);
                }}
            />
        </div>
    );
}

type AssignmentGroup = {
    clientId: number;
    clientNome: string;
    clientCognome: string;
    items: AssignmentRow[];
    latestAt: number;
};

function initials(nome: string | null, cognome: string | null): string {
    return `${(nome?.[0] ?? "?").toUpperCase()}${(cognome?.[0] ?? "").toUpperCase()}`;
}

function AssignmentList({
    items,
    emptyText,
    onSelect,
}: {
    items: AssignmentRow[];
    emptyText: string;
    onSelect: (id: number) => void;
}) {
    const [search, setSearch] = useState("");
    const [openClients, setOpenClients] = useState<Set<number>>(new Set());
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const groups: AssignmentGroup[] = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = q
            ? items.filter((a) => {
                  const haystack = `${a.client_nome ?? ""} ${a.client_cognome ?? ""} ${a.template_nome ?? ""}`.toLowerCase();
                  return haystack.includes(q);
              })
            : items;

        const map = new Map<number, AssignmentGroup>();
        for (const a of filtered) {
            const existing = map.get(a.client_id);
            const ts = new Date(
                a.status === "completed" && a.completed_at
                    ? a.completed_at
                    : a.sent_at,
            ).getTime();
            if (existing) {
                existing.items.push(a);
                if (ts > existing.latestAt) existing.latestAt = ts;
            } else {
                map.set(a.client_id, {
                    clientId: a.client_id,
                    clientNome: a.client_nome ?? "",
                    clientCognome: a.client_cognome ?? "",
                    items: [a],
                    latestAt: ts,
                });
            }
        }
        return Array.from(map.values()).sort(
            (a, b) => b.latestAt - a.latestAt,
        );
    }, [items, search]);

    const filtersKey = `${search}`;
    const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
    if (prevFiltersKey !== filtersKey) {
        setPage(1);
        setPrevFiltersKey(filtersKey);
    }

    const pagedGroups = useMemo(
        () => groups.slice((page - 1) * pageSize, page * pageSize),
        [groups, page, pageSize],
    );

    const hasSearch = search.trim().length > 0;

    if (items.length === 0) {
        return (
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="py-12 text-center">
                    <ClipboardList
                        className="mx-auto text-slate-300"
                        size={48}
                        strokeWidth={1.5}
                    />
                    <p className="mt-4 text-slate-700 font-semibold">
                        {emptyText}
                    </p>
                </CardContent>
            </Card>
        );
    }
    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Cerca per cliente o template…"
                    className="pl-9 border-slate-200 shadow-none h-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            {groups.length === 0 && (
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="py-8 text-center text-sm text-slate-500">
                        Nessun risultato per &quot;{search}&quot;.
                    </CardContent>
                </Card>
            )}
            {pagedGroups.map((g) => {
                const single = g.items.length === 1;
                const expanded = hasSearch || openClients.has(g.clientId);
                const pendingCount = g.items.filter(
                    (i) => i.status === "pending",
                ).length;
                const completedCount = g.items.filter(
                    (i) => i.status === "completed",
                ).length;

                return (
                    <Card
                        key={g.clientId}
                        className="bg-white border-slate-200 shadow-sm overflow-hidden"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                if (single) {
                                    onSelect(g.items[0].id);
                                    return;
                                }
                                setOpenClients((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(g.clientId))
                                        next.delete(g.clientId);
                                    else next.add(g.clientId);
                                    return next;
                                });
                            }}
                            className="w-full flex items-center justify-between gap-3 py-3 px-4 hover:bg-slate-50/60 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center brand-text font-bold text-sm shrink-0">
                                    {initials(g.clientNome, g.clientCognome)}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 truncate">
                                        {g.clientNome} {g.clientCognome}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                                        <span>
                                            {g.items.length}{" "}
                                            {g.items.length === 1
                                                ? "questionario"
                                                : "questionari"}
                                        </span>
                                        {pendingCount > 0 && (
                                            <>
                                                <span className="text-slate-300">
                                                    ·
                                                </span>
                                                <span className="text-amber-600">
                                                    {pendingCount} in attesa
                                                </span>
                                            </>
                                        )}
                                        {completedCount > 0 && (
                                            <>
                                                <span className="text-slate-300">
                                                    ·
                                                </span>
                                                <span className="brand-text">
                                                    {completedCount} risposto
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {single ? (
                                <Eye
                                    size={16}
                                    className="text-slate-300 shrink-0"
                                />
                            ) : (
                                <ChevronDown
                                    size={18}
                                    className={`text-slate-400 shrink-0 transition-transform ${
                                        expanded ? "rotate-180" : ""
                                    }`}
                                />
                            )}
                        </button>
                        {expanded && !single && (
                            <div className="border-t border-slate-100 bg-slate-50/40 divide-y divide-slate-100">
                                {g.items.map((a) => {
                                    const isCompleted = a.status === "completed";
                                    return (
                                        <button
                                            key={a.id}
                                            type="button"
                                            onClick={() => onSelect(a.id)}
                                            className="w-full flex items-center justify-between gap-3 py-2.5 px-4 pl-16 hover:bg-white transition-colors text-left"
                                        >
                                            <div className="min-w-0 flex items-center gap-2.5">
                                                <div
                                                    className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${
                                                        isCompleted
                                                            ? "brand-bg text-white"
                                                            : "bg-slate-200 text-slate-600"
                                                    }`}
                                                >
                                                    {isCompleted ? (
                                                        <CheckCircle2 size={14} />
                                                    ) : (
                                                        <Clock size={14} />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-slate-900 truncate">
                                                        {a.template_nome}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {isCompleted && a.completed_at
                                                            ? `Risposto ${formatDate(a.completed_at)}`
                                                            : `Inviato ${formatDate(a.sent_at)}`}
                                                        {a.motivo && (
                                                            <>
                                                                <span className="text-slate-300">
                                                                    ·
                                                                </span>
                                                                <span className="italic truncate">
                                                                    {a.motivo}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {isCompleted ? (
                                                <Eye
                                                    size={14}
                                                    className="text-slate-300 shrink-0"
                                                />
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] shrink-0"
                                                >
                                                    In attesa
                                                </Badge>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                );
            })}
            <Pagination
                page={page}
                pageSize={pageSize}
                total={groups.length}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(1);
                }}
            />
        </div>
    );
}

function AssignDialog({
    template,
    clients,
    onClose,
    onAssigned,
}: {
    template: Template;
    clients: ClientLite[];
    onClose: () => void;
    onAssigned: () => void;
}) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [motivo, setMotivo] = useState("");
    const [pending, startTransition] = useTransition();

    function toggle(id: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }
    function toggleAll() {
        if (selectedIds.size === clients.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(clients.map((c) => c.id)));
        }
    }

    function onSubmit() {
        if (selectedIds.size === 0) {
            toast.error("Seleziona almeno un cliente");
            return;
        }
        startTransition(async () => {
            const r = await assignTemplateToClients(
                template.id,
                Array.from(selectedIds),
                motivo.trim() || undefined
            );
            if (r.success) {
                toast.success(`Assegnato a ${r.created} clienti`);
                onAssigned();
            } else {
                toast.error(r.error || "Errore");
            }
        });
    }

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Send size={18} className="brand-text" />
                        <DialogTitle className="text-lg text-slate-900">
                            Assegna: {template.nome}
                        </DialogTitle>
                    </div>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            Motivo (opzionale)
                        </Label>
                        <Textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            rows={2}
                            placeholder="Es. CHECK RINNOVO scheda gennaio"
                            className="border-slate-200 shadow-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700">
                                Seleziona clienti ({selectedIds.size}/{clients.length})
                            </Label>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={toggleAll}
                                className="text-xs h-7"
                            >
                                {selectedIds.size === clients.length
                                    ? "Deseleziona tutti"
                                    : "Seleziona tutti"}
                            </Button>
                        </div>
                        <div className="border border-slate-200 rounded-lg max-h-72 overflow-y-auto">
                            {clients.length === 0 ? (
                                <p className="p-4 text-sm text-slate-500 text-center">
                                    Nessun cliente registrato.
                                </p>
                            ) : (
                                clients.map((c) => (
                                    <label
                                        key={c.id}
                                        className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(c.id)}
                                            onChange={() => toggle(c.id)}
                                            className="h-4 w-4 accent-current brand-text"
                                        />
                                        <UserRound
                                            size={14}
                                            className="text-slate-400"
                                        />
                                        <span className="text-sm text-slate-700">
                                            {c.cognome} {c.nome}
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
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
                        onClick={onSubmit}
                        disabled={pending || selectedIds.size === 0}
                        className="brand-bg text-white gap-2"
                    >
                        <Send size={14} />
                        {pending ? "Invio…" : `Assegna a ${selectedIds.size}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type DetailLoaded = {
    assignment: AssignmentRow;
    template: Template;
    client: ClientLite | null;
    response: { response_json: unknown; submitted_at: Date | string } | null;
};

function ResponseDetailDialog({
    assignmentId,
    onClose,
}: {
    assignmentId: number;
    onClose: () => void;
}) {
    const [data, setData] = useState<DetailLoaded | null>(null);
    const [loading, setLoading] = useState(true);
    const [pending] = useTransition();

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const r = await getAssignmentDetail(assignmentId);
            if (cancelled) return;
            if (!r) {
                toast.error("Non trovato");
                onClose();
                return;
            }
            setData(r as unknown as DetailLoaded);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [assignmentId, onClose]);

    async function onDelete() {
        const r = await deleteAssignment(assignmentId);
        if (r.success) {
            toast.success("Eliminato");
            window.location.reload();
        } else {
            toast.error(r.error || "Errore");
        }
    }

    if (loading || !data) {
        return (
            <Dialog open onOpenChange={(o) => !o && onClose()}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle className="sr-only">Caricamento…</DialogTitle>
                    </DialogHeader>
                    <div className="py-8 text-center text-slate-500">
                        Caricamento…
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const schema = data.template.schema_json as {
        sections?: { id: string; title: string; question_ids: string[] }[];
        questions: { id: string; type: string; label: string; options?: string[] }[];
    };
    const answers = (data.response?.response_json ?? {}) as Record<
        string,
        unknown
    >;
    const questionsById = new Map(schema.questions.map((q) => [q.id, q]));

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <ClipboardList size={18} className="brand-text" />
                        <DialogTitle className="text-lg text-slate-900">
                            {data.client?.nome} {data.client?.cognome}
                        </DialogTitle>
                    </div>
                    <p className="text-sm text-slate-500">
                        {data.template.nome}
                        {data.response?.submitted_at &&
                            ` · Risposto il ${formatDate(data.response.submitted_at)}`}
                    </p>
                </DialogHeader>

                {!data.response ? (
                    <div className="py-8 text-center">
                        <Clock
                            size={40}
                            className="mx-auto text-amber-400 mb-3"
                        />
                        <p className="text-sm font-medium text-slate-700">
                            In attesa di risposta dal cliente
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Inviato il {formatDate(data.assignment.sent_at)}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {schema.sections?.length ? (
                            schema.sections.map((sec) => (
                                <div key={sec.id} className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider brand-text">
                                        {sec.title}
                                    </h3>
                                    {sec.question_ids.map((qid) => {
                                        const q = questionsById.get(qid);
                                        if (!q) return null;
                                        return (
                                            <AnswerRow
                                                key={qid}
                                                question={q}
                                                answer={answers[qid]}
                                            />
                                        );
                                    })}
                                </div>
                            ))
                        ) : (
                            schema.questions.map((q) => (
                                <AnswerRow
                                    key={q.id}
                                    question={q}
                                    answer={answers[q.id]}
                                />
                            ))
                        )}
                    </div>
                )}

                <DialogFooter className="gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-slate-200"
                    >
                        Chiudi
                    </Button>
                    <ConfirmDeleteDialog
                        title="Eliminare questo assignment?"
                        description="L'assegnazione verrà rimossa. Se il cliente ha già compilato il questionario, anche le sue risposte verranno eliminate."
                        onConfirm={onDelete}
                        trigger={
                            <Button
                                variant="ghost"
                                disabled={pending}
                                className="text-rose-600 hover:bg-rose-50 gap-1.5"
                            >
                                <Trash2 size={14} />
                                Elimina
                            </Button>
                        }
                    />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AnswerRow({
    question,
    answer,
}: {
    question: { id: string; type: string; label: string; options?: string[] };
    answer: unknown;
}) {
    let display: React.ReactNode;
    if (
        answer === undefined ||
        answer === null ||
        answer === "" ||
        (Array.isArray(answer) && answer.length === 0)
    ) {
        display = (
            <span className="text-slate-400 italic">Nessuna risposta</span>
        );
    } else if (question.type === "confirm") {
        display = answer === true ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 text-sm">
                <CheckCircle2 size={14} /> Ho capito
            </span>
        ) : (
            <span className="text-slate-400 italic">Non confermato</span>
        );
    } else if (question.type === "upload" && typeof answer === "string") {
        const src = `/api/media/questionnaire-attachment?key=${encodeURIComponent(answer)}`;
        display = (
            <div className="space-y-2">
                <a href={src} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={src}
                        alt={question.label}
                        className="rounded-lg border border-slate-200 max-h-64 object-contain w-full bg-slate-50"
                    />
                </a>
                <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs brand-text hover:underline"
                >
                    Apri originale →
                </a>
            </div>
        );
    } else if (Array.isArray(answer)) {
        display = (
            <ul className="text-sm text-slate-700 list-disc pl-5">
                {answer.map((v, i) => (
                    <li key={i}>{String(v)}</li>
                ))}
            </ul>
        );
    } else if (question.type === "scale" && typeof answer === "number") {
        display = (
            <div className="flex items-center gap-2">
                <span className="text-xl font-bold brand-text tabular-nums">
                    {answer}
                </span>
                <span className="text-xs text-slate-400">/ 10</span>
            </div>
        );
    } else {
        display = (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {String(answer)}
            </p>
        );
    }

    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-1.5">
                {question.label}
            </p>
            {display}
        </div>
    );
}
