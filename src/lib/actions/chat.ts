"use server";

import { db } from "@/db";
import { chat_messages, clients } from "@/db/schema";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTrainer } from "@/lib/auth";
import {
    insertChatMessage,
    listConversationMessages,
    markConversationRead,
} from "@/lib/services/chat.service";
import { sendPushToClient } from "@/lib/fcm";
import {
    generateChatAttachmentKey,
    getR2SignedUploadUrl,
    getR2SignedUrl,
    uploadToR2,
} from "@/lib/r2";

const ALLOWED_CHAT_ATTACHMENT_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
    "video/mp4",
    "video/quicktime",
];

const MAX_CHAT_ATTACHMENT_BYTES = 25 * 1024 * 1024;

async function assertClientOwnership(trainerId: number, clientId: number) {
    const [c] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.trainer_id, trainerId)))
        .limit(1);
    if (!c) throw new Error("Cliente non autorizzato");
}

/**
 * Lista dei clienti con ultimo messaggio + counter unread per il trainer.
 * Per la pagina /chat (sidebar conversazioni).
 */
export async function listChatConversations() {
    const trainer = await getAuthenticatedTrainer();

    // Subquery: ultimo messaggio per ogni client_id del trainer
    const lastMessages = await db.execute(sql`
        SELECT DISTINCT ON (client_id)
            client_id,
            id,
            body,
            sender_role,
            created_at,
            attachment_r2_key
        FROM chat_messages
        WHERE trainer_id = ${trainer.id}
        ORDER BY client_id, created_at DESC
    `);

    type LastMessageRow = {
        client_id: number;
        id: number;
        body: string;
        sender_role: string;
        created_at: Date;
        attachment_r2_key: string | null;
    };
    const rows = (lastMessages as { rows?: LastMessageRow[] }).rows ??
        (lastMessages as unknown as LastMessageRow[]);

    if (rows.length === 0) return [];

    const clientIds = rows.map((r) => r.client_id);
    const clientsRows = await db
        .select({
            id: clients.id,
            nome: clients.nome,
            cognome: clients.cognome,
            email: clients.email,
        })
        .from(clients)
        .where(
            and(
                eq(clients.trainer_id, trainer.id),
                inArray(clients.id, clientIds)
            )
        );
    const clientsById = new Map(clientsRows.map((c) => [c.id, c]));

    // Unread per ogni conversazione
    const unread = await db
        .select({
            client_id: chat_messages.client_id,
            n: count(),
        })
        .from(chat_messages)
        .where(
            and(
                eq(chat_messages.trainer_id, trainer.id),
                inArray(chat_messages.client_id, clientIds),
                eq(chat_messages.sender_role, "client"),
                isNull(chat_messages.read_at)
            )
        )
        .groupBy(chat_messages.client_id);
    const unreadByClient = new Map(unread.map((u) => [u.client_id, u.n]));

    return rows
        .map((m) => {
            const c = clientsById.get(m.client_id);
            if (!c) return null;
            return {
                client_id: m.client_id,
                client_nome: c.nome,
                client_cognome: c.cognome,
                client_email: c.email,
                last_message: m.body,
                last_sender: m.sender_role,
                last_at: m.created_at,
                has_attachment: !!m.attachment_r2_key,
                unread: unreadByClient.get(m.client_id) ?? 0,
            };
        })
        .filter(
            (
                x
            ): x is {
                client_id: number;
                client_nome: string;
                client_cognome: string;
                client_email: string;
                last_message: string;
                last_sender: string;
                last_at: Date;
                has_attachment: boolean;
                unread: number;
            } => x !== null
        );
}

/** Messaggi della conversazione con un cliente specifico (trainer view). */
export async function getChatMessages(
    clientId: number,
    beforeId?: number,
    limit = 50
) {
    const trainer = await getAuthenticatedTrainer();
    await assertClientOwnership(trainer.id, clientId);
    const rows = await listConversationMessages({
        trainerId: trainer.id,
        clientId,
        beforeId,
        limit,
    });
    return rows.reverse(); // cronologico ascendente per la UI
}

/**
 * Trainer invia un messaggio al cliente.
 * Triggera anche una push notification al cliente.
 */
export async function sendChatMessageFromTrainer(
    clientId: number,
    body: string,
    options?: { attachmentR2Key?: string; attachmentMimeType?: string }
) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertClientOwnership(trainer.id, clientId);
        const text = body?.trim();
        if (!text && !options?.attachmentR2Key) {
            return { success: false, error: "Messaggio vuoto" };
        }
        const message = await insertChatMessage({
            trainerId: trainer.id,
            clientId,
            senderRole: "trainer",
            body: text || "",
            attachmentR2Key: options?.attachmentR2Key,
            attachmentMimeType: options?.attachmentMimeType,
        });

        // Push al cliente (non blocking)
        sendPushToClient(clientId, {
            title: "Nuovo messaggio dal trainer",
            body: text ? text.slice(0, 100) : "Ti ha inviato un allegato",
            data: { type: "chat_message", message_id: String(message.id) },
        }).catch((e) => console.warn("[push chat] failed:", e));

        revalidatePath("/chat");
        return { success: true, message };
    } catch (e) {
        console.error("Errore invio messaggio trainer:", e);
        return { success: false, error: "Errore interno server" };
    }
}

/** Trainer marca come letti i messaggi del cliente. */
export async function markConversationReadByTrainer(clientId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertClientOwnership(trainer.id, clientId);
        await markConversationRead({
            trainerId: trainer.id,
            clientId,
            readerRole: "trainer",
        });
        revalidatePath("/chat");
        return { success: true };
    } catch (e) {
        console.error("Errore mark read trainer:", e);
        return { success: false, error: "Errore interno server" };
    }
}

/** Conteggio messaggi non letti per il trainer (badge sidebar). */
export async function countUnreadForTrainer() {
    const trainer = await getAuthenticatedTrainer();
    const [row] = await db
        .select({ n: count() })
        .from(chat_messages)
        .where(
            and(
                eq(chat_messages.trainer_id, trainer.id),
                eq(chat_messages.sender_role, "client"),
                isNull(chat_messages.read_at)
            )
        );
    return row?.n ?? 0;
}

export async function getLatestMessageIdForTrainer(clientId: number) {
    const trainer = await getAuthenticatedTrainer();
    await assertClientOwnership(trainer.id, clientId);
    const [row] = await db
        .select({ id: chat_messages.id })
        .from(chat_messages)
        .where(
            and(
                eq(chat_messages.trainer_id, trainer.id),
                eq(chat_messages.client_id, clientId)
            )
        )
        .orderBy(desc(chat_messages.id))
        .limit(1);
    return row?.id ?? 0;
}

/**
 * Genera URL PUT firmato per caricare direttamente su R2 un allegato chat.
 * Restituisce anche la `r2_key` da passare a `sendChatMessageFromTrainer`.
 */
export async function getChatAttachmentUploadUrl(params: {
    clientId: number;
    filename: string;
    contentType: string;
    sizeBytes?: number;
}) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertClientOwnership(trainer.id, params.clientId);
        if (!params.filename) {
            return { success: false as const, error: "Filename richiesto" };
        }
        if (!ALLOWED_CHAT_ATTACHMENT_TYPES.includes(params.contentType)) {
            return {
                success: false as const,
                error: "Tipo file non supportato (ammessi: immagini, PDF, video mp4/mov)",
            };
        }
        if (
            typeof params.sizeBytes === "number" &&
            params.sizeBytes > MAX_CHAT_ATTACHMENT_BYTES
        ) {
            return {
                success: false as const,
                error: "File troppo grande (max 25MB)",
            };
        }

        const key = generateChatAttachmentKey(
            trainer.id,
            params.clientId,
            params.filename,
        );
        const url = await getR2SignedUploadUrl({
            key,
            contentType: params.contentType,
            expiresIn: 600,
        });

        return {
            success: true as const,
            upload_url: url,
            r2_key: key,
            method: "PUT" as const,
            headers: { "Content-Type": params.contentType },
            expires_in: 600,
        };
    } catch (e) {
        console.error("getChatAttachmentUploadUrl error:", e);
        return { success: false as const, error: "Errore interno" };
    }
}

/**
 * Upload server-side di un allegato chat: il browser admin manda il file via
 * server action (FormData) → Next.js lo inoltra a R2. Necessario perché R2
 * non ha CORS configurato per il dominio admin (il PUT diretto dal browser
 * fallisce con "Failed to fetch").
 */
export async function uploadChatAttachment(formData: FormData) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const clientIdRaw = formData.get("client_id");
        const file = formData.get("file");
        if (!clientIdRaw || !(file instanceof File)) {
            return { success: false as const, error: "Parametri mancanti" };
        }
        const clientId = Number(clientIdRaw);
        if (!Number.isFinite(clientId)) {
            return { success: false as const, error: "client_id non valido" };
        }
        await assertClientOwnership(trainer.id, clientId);

        const contentType = file.type || "application/octet-stream";
        if (!ALLOWED_CHAT_ATTACHMENT_TYPES.includes(contentType)) {
            return {
                success: false as const,
                error: "Tipo file non supportato (ammessi: immagini, PDF, video mp4/mov)",
            };
        }
        if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
            return {
                success: false as const,
                error: "File troppo grande (max 25MB)",
            };
        }

        const key = generateChatAttachmentKey(
            trainer.id,
            clientId,
            file.name || "attachment",
        );
        const buffer = Buffer.from(await file.arrayBuffer());
        await uploadToR2({ key, body: buffer, contentType });

        return {
            success: true as const,
            r2_key: key,
            mime_type: contentType,
        };
    } catch (e) {
        console.error("uploadChatAttachment error:", e);
        return { success: false as const, error: "Errore upload" };
    }
}

/**
 * URL firmato (GET, 1h) per visualizzare/scaricare un allegato di una
 * conversazione del trainer autenticato. Verifica che la key sia nel path
 * `trainers/<trainerId>/clients/<clientId>/chat/…`.
 */
export async function getChatAttachmentDownloadUrl(r2Key: string) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const expectedPrefix = `trainers/${trainer.id}/clients/`;
        if (!r2Key.startsWith(expectedPrefix) || !r2Key.includes("/chat/")) {
            return { success: false as const, error: "Allegato non accessibile" };
        }
        const url = await getR2SignedUrl(r2Key);
        return { success: true as const, url, expires_in: 3600 };
    } catch (e) {
        console.error("getChatAttachmentDownloadUrl error:", e);
        return { success: false as const, error: "Errore interno" };
    }
}
