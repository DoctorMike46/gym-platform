"use server"

import { db } from "@/db";
import { documents, clients } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedTrainer } from "@/lib/auth";
import { uploadToR2, getR2SignedUrl, deleteFromR2, generateR2Key } from "@/lib/r2";

export async function getDocumentsByClient(clientId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        // Verifica ownership del client
        const client = await db.query.clients.findFirst({
            where: and(eq(clients.id, clientId), eq(clients.trainer_id, trainer.id)),
        });
        if (!client) return [];

        return await db.select().from(documents)
            .where(and(eq(documents.client_id, clientId), eq(documents.trainer_id, trainer.id)))
            .orderBy(desc(documents.created_at));
    } catch (error) {
        console.error("Errore recupero documenti:", error);
        return [];
    }
}

export async function getAllDocuments() {
    const trainer = await getAuthenticatedTrainer();
    try {
        return await db.query.documents.findMany({
            where: eq(documents.trainer_id, trainer.id),
            with: { client: true },
            orderBy: [desc(documents.created_at)],
        });
    } catch (error) {
        console.error("Errore recupero tutti i documenti:", error);
        return [];
    }
}

export async function uploadDocument(formData: FormData) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const file = formData.get("file") as File;
        const clientId = parseInt(formData.get("client_id") as string);
        const tipoDocumento = formData.get("tipo_documento") as string;
        const dataDocumento = formData.get("data_documento") as string | null;
        const note = formData.get("note") as string | null;

        if (!file || !clientId || !tipoDocumento) {
            return { success: false, error: "Dati incompleti" };
        }

        // Verifica ownership del client
        const client = await db.query.clients.findFirst({
            where: and(eq(clients.id, clientId), eq(clients.trainer_id, trainer.id)),
        });
        if (!client) return { success: false, error: "Cliente non autorizzato" };

        // Validazione file
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
            return { success: false, error: "File troppo grande (max 10MB)" };
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const key = generateR2Key(trainer.id, clientId, file.name);

        // Upload su R2
        await uploadToR2({
            key,
            body: buffer,
            contentType: file.type,
        });

        // Salva nel DB
        await db.insert(documents).values({
            trainer_id: trainer.id,
            client_id: clientId,
            tipo_documento: tipoDocumento,
            nome_file: file.name,
            r2_key: key,
            mime_type: file.type,
            dimensione_bytes: file.size,
            note: note || null,
            data_documento: dataDocumento || new Date().toISOString().split('T')[0],
        });

        // Se è un consenso, aggiorna lo stato del cliente
        if (tipoDocumento === "consenso") {
            await db.update(clients)
                .set({ anamnesi_status: "firmato" })
                .where(eq(clients.id, clientId));
            revalidatePath("/clients");
            revalidatePath(`/clients/${clientId}`);
        }

        revalidatePath("/documents");
        return { success: true };
    } catch (error) {
        console.error("Errore upload documento:", error);
        return { success: false, error: "Errore durante l'upload" };
    }
}

export async function getDocumentDownloadUrl(documentId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const doc = await db.query.documents.findFirst({
            where: and(eq(documents.id, documentId), eq(documents.trainer_id, trainer.id)),
        });
        if (!doc) return { success: false, error: "Documento non trovato" };

        const url = await getR2SignedUrl(doc.r2_key);
        return { success: true, url, fileName: doc.nome_file };
    } catch (error) {
        console.error("Errore download documento:", error);
        return { success: false, error: "Errore generico" };
    }
}

export async function deleteDocument(documentId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const doc = await db.query.documents.findFirst({
            where: and(eq(documents.id, documentId), eq(documents.trainer_id, trainer.id)),
        });
        if (!doc) return { success: false, error: "Documento non trovato" };

        // Elimina da R2
        await deleteFromR2(doc.r2_key);

        // Elimina dal DB
        await db.delete(documents).where(eq(documents.id, documentId));

        // Se era un consenso, ripristina lo stato del cliente
        if (doc.tipo_documento === "consenso") {
            await db.update(clients)
                .set({ anamnesi_status: "non firmato" })
                .where(eq(clients.id, doc.client_id));
            revalidatePath("/clients");
            revalidatePath(`/clients/${doc.client_id}`);
        }

        revalidatePath("/documents");
        return { success: true };
    } catch (error) {
        console.error("Errore eliminazione documento:", error);
        return { success: false, error: "Errore generico" };
    }
}
