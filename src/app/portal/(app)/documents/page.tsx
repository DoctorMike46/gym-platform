import { requireClientAuth } from "@/lib/client-auth";
import { getMyDocuments } from "@/lib/actions/portal-documents";
import DocumentsList from "./documents-list";

export const dynamic = "force-dynamic";

export default async function PortalDocumentsPage() {
    await requireClientAuth();
    const docs = await getMyDocuments();
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">Documenti</h1>
                <p className="text-slate-500 text-sm mt-1">Schede, certificati, contratti</p>
            </div>
            <DocumentsList documents={docs} />
        </div>
    );
}
