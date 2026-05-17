"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Eye, FilterX, ExternalLink } from "lucide-react";
import { getClientProgressPhotoUrl } from "@/lib/actions/trainer-portal-mirror";
import { toast } from "sonner";

const DEFAULT_PAGE_SIZE = 10;

type WorkoutLog = {
    id: number;
    date_executed: string | Date;
    giorno: number | null;
    total_duration_seconds: number | null;
    trainer_note: string | null;
    status: string;
};

type Measurement = {
    id: number;
    date: string | Date;
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
    date: string | Date;
    type: string;
    note: string | null;
};

function toDateStr(d: string | Date): string {
    return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

function inDateRange(d: string | Date, from: string, to: string): boolean {
    const day = toDateStr(d);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
}

export default function DiaryContent({
    clientId,
    logs,
    measurements,
    photos,
}: {
    clientId: number;
    logs: WorkoutLog[];
    measurements: Measurement[];
    photos: Photo[];
}) {
    return (
        <TooltipProvider delayDuration={300}>
            <Tabs defaultValue="logs">
                <TabsList className="w-full overflow-x-auto justify-start sm:w-auto sm:justify-center">
                    <TabsTrigger value="logs" className="text-xs sm:text-sm data-[state=active]:brand-bg data-[state=active]:!text-white">
                        <span className="sm:hidden">Allen. ({logs.length})</span>
                        <span className="hidden sm:inline">Allenamenti ({logs.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="measurements" className="text-xs sm:text-sm data-[state=active]:brand-bg data-[state=active]:!text-white">
                        <span className="sm:hidden">Misur. ({measurements.length})</span>
                        <span className="hidden sm:inline">Misurazioni ({measurements.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="photos" className="text-xs sm:text-sm data-[state=active]:brand-bg data-[state=active]:!text-white">Foto ({photos.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="logs" className="mt-4">
                    <WorkoutLogsTab clientId={clientId} logs={logs} />
                </TabsContent>

                <TabsContent value="measurements" className="mt-4">
                    <MeasurementsTab measurements={measurements} />
                </TabsContent>

                <TabsContent value="photos" className="mt-4">
                    <PhotosTab photos={photos} />
                </TabsContent>
            </Tabs>
        </TooltipProvider>
    );
}

/* ──────────────────────────────────────────────────────────────
 * Tab Allenamenti
 * ────────────────────────────────────────────────────────────── */
function WorkoutLogsTab({ clientId, logs }: { clientId: number; logs: WorkoutLog[] }) {
    const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "in_progress" | "skipped">("all");
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const filtered = useMemo(() => logs.filter((l) => {
        if (filterStatus !== "all" && l.status !== filterStatus) return false;
        if (!inDateRange(l.date_executed, filterFrom, filterTo)) return false;
        return true;
    }), [logs, filterStatus, filterFrom, filterTo]);

    const filtersKey = `${filterStatus}|${filterFrom}|${filterTo}`;
    const [prevKey, setPrevKey] = useState(filtersKey);
    if (prevKey !== filtersKey) {
        setPage(1);
        setPrevKey(filtersKey);
    }

    const paged = useMemo(
        () => filtered.slice((page - 1) * pageSize, page * pageSize),
        [filtered, page, pageSize],
    );

    const hasActiveFilters = filterStatus !== "all" || filterFrom !== "" || filterTo !== "";

    return (
        <div className="space-y-4">
            <FiltersBar onReset={hasActiveFilters ? () => { setFilterStatus("all"); setFilterFrom(""); setFilterTo(""); } : undefined}>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as "all" | "completed" | "in_progress" | "skipped")}>
                    <SelectTrigger className="w-full md:w-[170px] border-slate-200 shadow-none h-10">
                        <SelectValue placeholder="Stato" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tutti gli stati</SelectItem>
                        <SelectItem value="completed">Completato</SelectItem>
                        <SelectItem value="in_progress">In corso</SelectItem>
                        <SelectItem value="skipped">Saltato</SelectItem>
                    </SelectContent>
                </Select>
                <DateRangeFields from={filterFrom} to={filterTo} onFromChange={setFilterFrom} onToChange={setFilterTo} />
            </FiltersBar>

            {/* Desktop */}
            <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-slate-50 border-slate-200">
                            <TableHead className="text-slate-700 font-semibold">Data</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Giorno</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Durata</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Stato</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Nota</TableHead>
                            <TableHead className="text-center text-slate-700 font-semibold w-[100px]">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                                    {logs.length === 0 ? "Nessun allenamento loggato." : "Nessun allenamento corrisponde ai filtri."}
                                </TableCell>
                            </TableRow>
                        )}
                        {paged.map((l) => (
                            <TableRow key={l.id} className="border-slate-200 hover:bg-slate-50/70">
                                <TableCell className="font-medium text-slate-900">
                                    {new Date(l.date_executed).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                                </TableCell>
                                <TableCell className="text-slate-600">{l.giorno ?? "—"}</TableCell>
                                <TableCell className="text-slate-600">
                                    {l.total_duration_seconds ? `${Math.round(l.total_duration_seconds / 60)} min` : "—"}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={l.status === "completed" ? "default" : "outline"}
                                        className={
                                            l.status === "completed"
                                                ? "brand-bg !text-white border-0"
                                                : l.status === "in_progress"
                                                    ? "brand-text brand-border"
                                                    : ""
                                        }
                                    >
                                        {l.status === "completed" ? "Completato" : l.status === "in_progress" ? "In corso" : "Saltato"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-slate-500 max-w-[260px] truncate">
                                    {l.trainer_note ? <span className="text-emerald-600 font-medium">Presente</span> : "—"}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link href={`/clients/${clientId}/diary/${l.id}`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                                        <Eye size={15} />
                                                    </Button>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent>Apri dettaglio</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-2">
                {filtered.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                        {logs.length === 0 ? "Nessun allenamento loggato." : "Nessun allenamento corrisponde ai filtri."}
                    </div>
                ) : (
                    paged.map((l) => (
                        <Link key={l.id} href={`/clients/${clientId}/diary/${l.id}`} className="block rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3 hover:bg-slate-50">
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {new Date(l.date_executed).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {l.giorno !== null && <>Giorno {l.giorno}</>}
                                        {l.total_duration_seconds && <> • {Math.round(l.total_duration_seconds / 60)} min</>}
                                    </p>
                                </div>
                                <Badge
                                    variant={l.status === "completed" ? "default" : "outline"}
                                    className={
                                        l.status === "completed"
                                            ? "shrink-0 brand-bg !text-white border-0"
                                            : l.status === "in_progress"
                                                ? "shrink-0 brand-text brand-border"
                                                : "shrink-0"
                                    }
                                >
                                    {l.status === "completed" ? "Completato" : l.status === "in_progress" ? "In corso" : "Saltato"}
                                </Badge>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            <Pagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────
 * Tab Misurazioni
 * ────────────────────────────────────────────────────────────── */
function MeasurementsTab({ measurements }: { measurements: Measurement[] }) {
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const filtered = useMemo(() => measurements.filter((m) => inDateRange(m.date, filterFrom, filterTo)), [measurements, filterFrom, filterTo]);

    const filtersKey = `${filterFrom}|${filterTo}`;
    const [prevKey, setPrevKey] = useState(filtersKey);
    if (prevKey !== filtersKey) {
        setPage(1);
        setPrevKey(filtersKey);
    }

    const paged = useMemo(
        () => filtered.slice((page - 1) * pageSize, page * pageSize),
        [filtered, page, pageSize],
    );

    const hasActiveFilters = filterFrom !== "" || filterTo !== "";

    return (
        <div className="space-y-4">
            <FiltersBar onReset={hasActiveFilters ? () => { setFilterFrom(""); setFilterTo(""); } : undefined}>
                <DateRangeFields from={filterFrom} to={filterTo} onFromChange={setFilterFrom} onToChange={setFilterTo} />
            </FiltersBar>

            {/* Desktop */}
            <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-slate-50 border-slate-200">
                            <TableHead className="text-slate-700 font-semibold">Data</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Peso</TableHead>
                            <TableHead className="text-slate-700 font-semibold">BF %</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Vita</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Fianchi</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Petto</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Braccio</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Coscia</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Note</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                                    {measurements.length === 0 ? "Nessuna misurazione registrata." : "Nessuna misurazione nel periodo selezionato."}
                                </TableCell>
                            </TableRow>
                        )}
                        {paged.map((m) => (
                            <TableRow key={m.id} className="border-slate-200 hover:bg-slate-50/70">
                                <TableCell className="font-medium text-slate-900">
                                    {new Date(m.date).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                                </TableCell>
                                <TableCell className="text-slate-700">{m.peso_kg ? `${m.peso_kg} kg` : "—"}</TableCell>
                                <TableCell className="text-slate-700">{m.body_fat_pct ? `${m.body_fat_pct}%` : "—"}</TableCell>
                                <TableCell className="text-slate-700">{m.vita_cm ? `${m.vita_cm} cm` : "—"}</TableCell>
                                <TableCell className="text-slate-700">{m.fianchi_cm ? `${m.fianchi_cm} cm` : "—"}</TableCell>
                                <TableCell className="text-slate-700">{m.petto_cm ? `${m.petto_cm} cm` : "—"}</TableCell>
                                <TableCell className="text-slate-700">{m.braccio_cm ? `${m.braccio_cm} cm` : "—"}</TableCell>
                                <TableCell className="text-slate-700">{m.coscia_cm ? `${m.coscia_cm} cm` : "—"}</TableCell>
                                <TableCell className="text-xs text-slate-500 max-w-[200px] truncate" title={m.note ?? undefined}>
                                    {m.note || "—"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-2">
                {filtered.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                        {measurements.length === 0 ? "Nessuna misurazione registrata." : "Nessuna misurazione nel periodo selezionato."}
                    </div>
                ) : (
                    paged.map((m) => (
                        <div key={m.id} className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3">
                            <p className="text-sm font-semibold text-slate-900">
                                {new Date(m.date).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-600 mt-2">
                                {m.peso_kg && <span><strong>{m.peso_kg}</strong> kg</span>}
                                {m.body_fat_pct && <span>BF {m.body_fat_pct}%</span>}
                                {m.vita_cm && <span>Vita {m.vita_cm} cm</span>}
                                {m.fianchi_cm && <span>Fianchi {m.fianchi_cm} cm</span>}
                                {m.petto_cm && <span>Petto {m.petto_cm} cm</span>}
                                {m.braccio_cm && <span>Braccio {m.braccio_cm} cm</span>}
                                {m.coscia_cm && <span>Coscia {m.coscia_cm} cm</span>}
                            </div>
                            {m.note && <p className="text-xs text-slate-500 mt-2 italic">{m.note}</p>}
                        </div>
                    ))
                )}
            </div>

            <Pagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────
 * Tab Foto
 * ────────────────────────────────────────────────────────────── */
function PhotosTab({ photos }: { photos: Photo[] }) {
    const [filterType, setFilterType] = useState<"all" | "front" | "side" | "back">("all");
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const filtered = useMemo(() => photos.filter((p) => {
        if (filterType !== "all" && p.type !== filterType) return false;
        if (!inDateRange(p.date, filterFrom, filterTo)) return false;
        return true;
    }), [photos, filterType, filterFrom, filterTo]);

    const filtersKey = `${filterType}|${filterFrom}|${filterTo}`;
    const [prevKey, setPrevKey] = useState(filtersKey);
    if (prevKey !== filtersKey) {
        setPage(1);
        setPrevKey(filtersKey);
    }

    const paged = useMemo(
        () => filtered.slice((page - 1) * pageSize, page * pageSize),
        [filtered, page, pageSize],
    );

    const hasActiveFilters = filterType !== "all" || filterFrom !== "" || filterTo !== "";

    async function openPhoto(id: number) {
        try {
            const url = await getClientProgressPhotoUrl(id);
            window.open(url, "_blank");
        } catch {
            toast.error("Errore caricamento foto");
        }
    }

    function typeLabel(t: string) {
        return t === "front" ? "Frontale" : t === "side" ? "Laterale" : t === "back" ? "Posteriore" : t;
    }

    return (
        <div className="space-y-4">
            <FiltersBar onReset={hasActiveFilters ? () => { setFilterType("all"); setFilterFrom(""); setFilterTo(""); } : undefined}>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as "all" | "front" | "side" | "back")}>
                    <SelectTrigger className="w-full md:w-[170px] border-slate-200 shadow-none h-10">
                        <SelectValue placeholder="Tipo foto" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tutti i tipi</SelectItem>
                        <SelectItem value="front">Frontale</SelectItem>
                        <SelectItem value="side">Laterale</SelectItem>
                        <SelectItem value="back">Posteriore</SelectItem>
                    </SelectContent>
                </Select>
                <DateRangeFields from={filterFrom} to={filterTo} onFromChange={setFilterFrom} onToChange={setFilterTo} />
            </FiltersBar>

            {/* Desktop */}
            <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-slate-50 border-slate-200">
                            <TableHead className="text-slate-700 font-semibold">Data</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Tipo</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Note</TableHead>
                            <TableHead className="text-center text-slate-700 font-semibold w-[100px]">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-10 text-slate-500">
                                    {photos.length === 0 ? "Nessuna foto caricata dal cliente." : "Nessuna foto corrisponde ai filtri."}
                                </TableCell>
                            </TableRow>
                        )}
                        {paged.map((p) => (
                            <TableRow key={p.id} className="border-slate-200 hover:bg-slate-50/70">
                                <TableCell className="font-medium text-slate-900">
                                    {new Date(p.date).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{typeLabel(p.type)}</Badge>
                                </TableCell>
                                <TableCell className="text-xs text-slate-500 max-w-[260px] truncate" title={p.note ?? undefined}>
                                    {p.note || "—"}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => openPhoto(p.id)}>
                                                    <ExternalLink size={15} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Apri foto</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-2">
                {filtered.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                        {photos.length === 0 ? "Nessuna foto caricata dal cliente." : "Nessuna foto corrisponde ai filtri."}
                    </div>
                ) : (
                    paged.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => openPhoto(p.id)}
                            className="w-full text-left rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-2"
                        >
                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    {new Date(p.date).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                                </p>
                                <Badge variant="outline" className="mt-1">{typeLabel(p.type)}</Badge>
                            </div>
                            <ExternalLink size={16} className="text-slate-400 shrink-0" />
                        </button>
                    ))
                )}
            </div>

            <Pagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────
 * Helpers UI condivisi
 * ────────────────────────────────────────────────────────────── */
function FiltersBar({ children, onReset }: { children: React.ReactNode; onReset?: () => void }) {
    return (
        <div className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3 flex-1">
                {children}
            </div>
            {onReset && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0 self-end md:self-auto"
                            onClick={onReset}
                        >
                            <FilterX size={18} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Resetta filtri</TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}

function DateRangeFields({
    from, to, onFromChange, onToChange,
}: {
    from: string; to: string;
    onFromChange: (v: string) => void;
    onToChange: (v: string) => void;
}) {
    return (
        <>
            <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 ml-1">Da</span>
                <Input
                    type="date"
                    value={from}
                    onChange={(e) => onFromChange(e.target.value)}
                    className="w-full md:w-[160px] border-slate-200 shadow-none h-10"
                />
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 ml-1">A</span>
                <Input
                    type="date"
                    value={to}
                    onChange={(e) => onToChange(e.target.value)}
                    className="w-full md:w-[160px] border-slate-200 shadow-none h-10"
                />
            </div>
        </>
    );
}
