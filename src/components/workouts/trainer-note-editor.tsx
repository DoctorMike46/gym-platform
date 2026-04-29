"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { setClientWorkoutLogNote } from "@/lib/actions/trainer-portal-mirror";

interface TrainerNoteEditorProps {
    logId: number;
    initialNote: string | null;
    initialUpdatedAt: Date | null;
}

export function TrainerNoteEditor({ logId, initialNote, initialUpdatedAt }: TrainerNoteEditorProps) {
    const [note, setNote] = useState(initialNote ?? "");
    const [savedAt, setSavedAt] = useState<Date | null>(initialUpdatedAt);
    const [pending, startTransition] = useTransition();

    const dirty = (initialNote ?? "") !== note;

    function save() {
        startTransition(async () => {
            try {
                await setClientWorkoutLogNote(logId, note);
                setSavedAt(new Date());
                toast.success("Nota salvata");
            } catch {
                toast.error("Errore nel salvataggio della nota");
            }
        });
    }

    return (
        <div className="space-y-2">
            <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Scrivi un commento per il cliente su questa sessione…"
                className="resize-y"
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-[10px] text-slate-400">
                    {savedAt
                        ? `Aggiornata il ${new Date(savedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                        : "Nessuna nota ancora salvata"}
                </p>
                <Button
                    size="sm"
                    onClick={save}
                    disabled={pending || !dirty}
                    className="brand-bg text-white gap-2 w-full sm:w-auto"
                >
                    <Save size={14} /> {pending ? "Salvataggio…" : "Salva nota"}
                </Button>
            </div>
        </div>
    );
}
