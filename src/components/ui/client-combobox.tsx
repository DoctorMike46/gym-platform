"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ClientLite = {
    id: number;
    nome: string;
    cognome: string;
    email?: string | null;
};

type Props = {
    clients: ClientLite[];
    value: string;
    onChange: (clientId: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
};

export function ClientCombobox({
    clients,
    value,
    onChange,
    placeholder = "Seleziona cliente",
    disabled,
    className,
}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = useMemo(
        () => clients.find((c) => String(c.id) === value),
        [clients, value],
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return clients;
        return clients.filter((c) => {
            const hay = `${c.cognome} ${c.nome} ${c.email ?? ""}`.toLowerCase();
            return hay.includes(q);
        });
    }, [clients, query]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "flex w-full items-center justify-between border border-slate-200 shadow-none h-10 rounded-md px-3 text-sm bg-white",
                    "hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",
                    !selected && "text-slate-400",
                )}
            >
                <span className="truncate">
                    {selected
                        ? `${selected.cognome} ${selected.nome}`
                        : placeholder}
                </span>
                <ChevronsUpDown size={14} className="ml-2 text-slate-400 shrink-0" />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search
                                size={14}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <Input
                                autoFocus
                                placeholder="Cerca cliente…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-8 border-slate-200 shadow-none h-8 text-sm"
                            />
                        </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-slate-500">
                                Nessun cliente trovato.
                            </div>
                        ) : (
                            filtered.map((c) => {
                                const isSel = String(c.id) === value;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(String(c.id));
                                            setOpen(false);
                                            setQuery("");
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors",
                                            isSel && "bg-slate-50",
                                        )}
                                    >
                                        <Check
                                            size={14}
                                            className={cn(
                                                "shrink-0",
                                                isSel ? "brand-text" : "opacity-0",
                                            )}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-slate-900 truncate">
                                                {c.cognome} {c.nome}
                                            </div>
                                            {c.email && (
                                                <div className="text-xs text-slate-500 truncate">
                                                    {c.email}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
