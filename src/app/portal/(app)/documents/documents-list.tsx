"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import { getMyDocumentDownloadUrl } from "@/lib/actions/portal-documents";
import { toast } from "sonner";

type Doc = {
    id: number;
    tipo_documento: string;
    nome_file: string;
    mime_type: string | null;
    dimensione_bytes: number | null;
    data_documento: string;
};

const typeLabels: Record<string, string> = {
    consenso: "Consenso",
    scheda: "Scheda",
    foto_progresso: "Foto progresso",
};

export default function DocumentsList({ documents }: { documents: Doc[] }) {
    async function handleDownload(id: number) {
        try {
            const url = await getMyDocumentDownloadUrl(id);
            window.open(url, "_blank");
        } catch {
            toast.error("Errore download");
        }
    }

    if (documents.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500">Nessun documento disponibile</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {documents.map((doc) => (
                <Card key={doc.id}>
                    <CardContent className="py-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                <FileText size={18} className="text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 truncate">{doc.nome_file}</p>
                                <div className="flex flex-wrap gap-2 mt-0.5">
                                    <Badge variant="outline" className="text-[10px]">{typeLabels[doc.tipo_documento] || doc.tipo_documento}</Badge>
                                    <span className="text-[10px] text-slate-400">
                                        {new Date(doc.data_documento).toLocaleDateString("it-IT")}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDownload(doc.id)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700"
                            aria-label="Scarica"
                        >
                            <Download size={18} />
                        </button>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
