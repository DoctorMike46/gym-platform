"use client";

import { Trash2 } from "lucide-react";
import { getClientProgressPhotoUrl } from "@/lib/actions/trainer-portal-mirror";
import { toast } from "sonner";

type Photo = {
    id: number;
    date: string;
    type: string;
    note: string | null;
};

export default function DiaryPhotoGrid({ photos }: { photos: Photo[] }) {
    if (photos.length === 0) {
        return <p className="text-sm text-slate-500">Nessuna foto caricata dal cliente.</p>;
    }

    async function open(id: number) {
        try {
            const url = await getClientProgressPhotoUrl(id);
            window.open(url, "_blank");
        } catch {
            toast.error("Errore caricamento foto");
        }
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((p) => (
                <button
                    key={p.id}
                    onClick={() => open(p.id)}
                    className="aspect-square bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center text-xs text-slate-500 hover:text-slate-700 hover:shadow"
                >
                    <span className="text-center px-2">
                        <strong className="block">{p.type === "front" ? "Frontale" : p.type === "side" ? "Laterale" : "Posteriore"}</strong>
                        {new Date(p.date).toLocaleDateString("it-IT")}
                    </span>
                </button>
            ))}
        </div>
    );
}
