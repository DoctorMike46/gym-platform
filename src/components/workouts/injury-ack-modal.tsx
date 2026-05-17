"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";
import type { ClientInjury } from "@/lib/services/injuries.types";

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

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    injuries: ClientInjury[];
    onConfirm: () => void;
    busy?: boolean;
}

/**
 * Modal di conferma pre-assegnazione scheda. Mostra gli infortuni attivi
 * e richiede al trainer di spuntare un acknowledgment esplicito.
 */
export function InjuryAckModal({ open, onOpenChange, injuries, onConfirm, busy }: Props) {
    const [acknowledged, setAcknowledged] = useState(false);

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) setAcknowledged(false);
                onOpenChange(v);
            }}
        >
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-rose-700">
                        <AlertTriangle size={20} />
                        Infortuni attivi del cliente
                    </DialogTitle>
                    <DialogDescription>
                        Prima di procedere con l&apos;assegnazione, conferma di aver considerato
                        questi infortuni nella programmazione della scheda.
                    </DialogDescription>
                </DialogHeader>

                <ul className="my-3 space-y-2 max-h-[280px] overflow-y-auto">
                    {injuries.map((i) => (
                        <li
                            key={i.id}
                            className="border border-slate-200 rounded-lg p-3 text-sm"
                        >
                            <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-slate-900">
                                    {PART_LABEL[i.parte_corpo] ?? i.parte_corpo}
                                </strong>
                                <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        i.gravita === "grave"
                                            ? "bg-rose-100 text-rose-700"
                                            : i.gravita === "media"
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-yellow-100 text-yellow-700"
                                    }`}
                                >
                                    {i.gravita}
                                </span>
                                {i.tipo && (
                                    <span className="text-xs text-slate-500">
                                        ({i.tipo})
                                    </span>
                                )}
                            </div>
                            {i.note && (
                                <p className="text-xs text-slate-600 mt-1.5">{i.note}</p>
                            )}
                        </li>
                    ))}
                </ul>

                <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                    <Checkbox
                        checked={acknowledged}
                        onCheckedChange={(v) => setAcknowledged(v === true)}
                        className="mt-0.5"
                    />
                    <span>
                        Confermo di aver considerato questi infortuni nella programmazione
                        della scheda e di averla adattata di conseguenza.
                    </span>
                </label>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setAcknowledged(false);
                            onOpenChange(false);
                        }}
                        disabled={busy}
                    >
                        Annulla
                    </Button>
                    <Button
                        type="button"
                        className="brand-bg text-white"
                        disabled={!acknowledged || busy}
                        onClick={() => {
                            onConfirm();
                            setAcknowledged(false);
                        }}
                    >
                        Conferma e assegna
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
