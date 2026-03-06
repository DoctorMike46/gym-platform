import { getAllDocuments } from "@/lib/actions/documents";
import { getClients } from "@/lib/actions/clients";
import DocumentsContent from "./documents-content"
import { requireAuth } from "@/lib/auth";

export default async function DocumentsPage() {
    await requireAuth();
    const documentsData = await getAllDocuments();
    const clientsData = await getClients();

    return (
        <DocumentsContent
            documentsData={documentsData}
            clientsData={clientsData}
        />
    );
}
