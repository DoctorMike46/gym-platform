"use server";

import { requireClientAuth } from "@/lib/client-auth";
import {
    listClientDocuments,
    getClientDocumentDownloadUrl,
} from "@/lib/services/documents.service";

export async function getMyDocuments() {
    const session = await requireClientAuth();
    return listClientDocuments(session);
}

export async function getMyDocumentDownloadUrl(documentId: number) {
    const session = await requireClientAuth();
    return getClientDocumentDownloadUrl(session, documentId);
}
