"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";
import type { ClientInjury } from "@/lib/services/injuries.service";

const PART_LABEL: Record<string, string> = {
    spalla_sx: "Spalla sx", spalla_dx: "Spalla dx",
    gomito_sx: "Gomito sx", gomito_dx: "Gomito dx",
    polso_sx: "Polso sx", polso_dx: "Polso dx",
    mano: "Mano",
    schiena_lombare: "Schiena lombare", schiena_dorsale: "Schiena dorsale", schiena_cervicale: "Cervicale",
    collo: "Collo",
    anca_sx: "Anca sx", anca_dx: "Anca dx",
    ginocchio_sx: "Ginocchio sx", ginocchio_dx: "Ginocchio dx",
    caviglia_sx: "Caviglia sx", caviglia_dx: "Caviglia dx",
    piede: "Piede",
    altro: "Altro",
};

const GRAVITA_LABEL: Record<string, string> = {
    leggera: "leggera",
    media: "media",
    grave: "grave",
};

function severityLevel(injuries: ClientInjury[]): "leggera" | "media" | "grave" {
    if (injuries.some((i) => i.gravita === "grave")) return "grave";
    if (injuries.some((i) => i.gravita === "media")) return "media";
    return "leggera";
}

function colorClasses(level: "leggera" | "media" | "grave"): {
    container: string;
    icon: string;
    title: string;
} {
    if (level === "grave") {
        return {
            container: "bg-rose-50 border-rose-200",
            icon: "text-rose-600",
            title: "text-rose-900",
        };
    }
    if (level === "media") {
        return {
            container: "bg-amber-50 border-amber-200",
            icon: "text-amber-600",
            title: "text-amber-900",
        };
    }
    return {
        container: "bg-yellow-50 border-yellow-200",
        icon: "text-yellow-600",
        title: "text-yellow-900",
    };
}

/**
 * Banner sticky in cima alla pagina cliente quando ha infortuni attivi.
 * Mostra severity max e elenco compatto delle parti del corpo coinvolte.
 */
export function InjuryBanner({
    injuries,
    clientName,
    onOpenDetails,
}: {
    injuries: ClientInjury[];
    clientName?: string;
    onOpenDetails?: () => void;
}) {
    if (injuries.length === 0) return null;

    const level = severityLevel(injuries);
    const c = colorClasses(level);
    const title =
        level === "grave"
            ? "Attenzione: infortuni gravi attivi"
            : level === "media"
                ? "Infortuni di media entità attivi"
                : "Infortuni leggeri attivi";

    return (
        <div
            className={`border rounded-xl p-4 flex items-start gap-3 ${c.container}`}
            role="alert"
        >
            <AlertTriangle className={`shrink-0 mt-0.5 ${c.icon}`} size={20} />
            <div className="flex-1 min-w-0">
                <p className={`font-semibold ${c.title}`}>
                    {title}
                    {clientName ? ` — ${clientName}` : ""}
                </p>
                <ul className="mt-1 text-sm text-slate-700 space-y-0.5">
                    {injuries.slice(0, 5).map((i) => (
                        <li key={i.id}>
                            <strong>{PART_LABEL[i.parte_corpo] ?? i.parte_corpo}</strong>
                            {" — "}
                            <span className="capitalize">{GRAVITA_LABEL[i.gravita]}</span>
                            {i.tipo ? `, ${i.tipo}` : ""}
                            {i.note ? <span className="text-slate-500"> · {i.note.slice(0, 80)}{i.note.length > 80 ? "…" : ""}</span> : null}
                        </li>
                    ))}
                    {injuries.length > 5 && (
                        <li className="text-slate-500">…e altri {injuries.length - 5}</li>
                    )}
                </ul>
                <p className="text-xs text-slate-600 mt-2">
                    Considera questi infortuni quando assegni schede o piani.
                </p>
            </div>
            {onOpenDetails && (
                <button
                    type="button"
                    onClick={onOpenDetails}
                    className={`shrink-0 text-sm font-medium flex items-center gap-1 hover:underline ${c.title}`}
                >
                    Gestisci <ChevronRight size={14} />
                </button>
            )}
        </div>
    );
}
