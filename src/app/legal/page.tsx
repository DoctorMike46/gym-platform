import Link from "next/link";
import { Shield, FileText } from "lucide-react";

export default function LegalIndexPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    Documenti legali
                </h1>
                <p className="text-slate-500">
                    Tutti i documenti relativi all&apos;utilizzo della piattaforma
                    e al trattamento dei tuoi dati.
                </p>
            </div>

            <Link
                href="/legal/privacy"
                className="block rounded-2xl bg-white border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition"
            >
                <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <Shield size={18} className="text-slate-700" />
                    </div>
                    <div>
                        <div className="font-semibold text-slate-900">
                            Informativa sulla Privacy
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                            Come trattiamo i tuoi dati personali e i tuoi diritti
                            ai sensi del GDPR.
                        </div>
                    </div>
                </div>
            </Link>

            <Link
                href="/legal/terms"
                className="block rounded-2xl bg-white border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition"
            >
                <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <FileText size={18} className="text-slate-700" />
                    </div>
                    <div>
                        <div className="font-semibold text-slate-900">
                            Termini e Condizioni di Servizio
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                            Le regole di utilizzo della piattaforma.
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
