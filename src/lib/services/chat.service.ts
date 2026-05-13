import { db } from "@/db";
import { chat_messages } from "@/db/schema";
import { and, asc, count, desc, eq, isNull, lt } from "drizzle-orm";
import type { ClientSession } from "@/lib/client-auth";

export type ChatRole = "trainer" | "client";

export interface ChatMessageRow {
    id: number;
    trainer_id: number;
    client_id: number;
    sender_role: string;
    body: string;
    attachment_r2_key: string | null;
    attachment_mime_type: string | null;
    read_at: Date | null;
    created_at: Date;
}

/**
 * Lista messaggi di una conversazione, paginazione "cursor before id"
 * (i più recenti per primi se direction='desc', il default).
 */
export async function listConversationMessages(opts: {
    trainerId: number;
    clientId: number;
    limit?: number;
    beforeId?: number;
}): Promise<ChatMessageRow[]> {
    const limit = Math.min(opts.limit ?? 50, 200);
    const conditions = [
        eq(chat_messages.trainer_id, opts.trainerId),
        eq(chat_messages.client_id, opts.clientId),
    ];
    if (opts.beforeId !== undefined) {
        conditions.push(lt(chat_messages.id, opts.beforeId));
    }
    return db
        .select()
        .from(chat_messages)
        .where(and(...conditions))
        .orderBy(desc(chat_messages.id))
        .limit(limit);
}

/**
 * Inserisce un messaggio.
 * `senderRole` deve essere coerente con chi sta scrivendo
 * (validato dal chiamante: client mobile o trainer dashboard).
 */
export async function insertChatMessage(opts: {
    trainerId: number;
    clientId: number;
    senderRole: ChatRole;
    body: string;
    attachmentR2Key?: string | null;
    attachmentMimeType?: string | null;
}): Promise<ChatMessageRow> {
    const [row] = await db
        .insert(chat_messages)
        .values({
            trainer_id: opts.trainerId,
            client_id: opts.clientId,
            sender_role: opts.senderRole,
            body: opts.body,
            attachment_r2_key: opts.attachmentR2Key ?? null,
            attachment_mime_type: opts.attachmentMimeType ?? null,
        })
        .returning();
    return row as ChatMessageRow;
}

/**
 * Marca come letti tutti i messaggi del partner (= dell'altro ruolo)
 * non ancora letti. Restituisce il numero di righe aggiornate.
 */
export async function markConversationRead(opts: {
    trainerId: number;
    clientId: number;
    /** chi sta marcando come letti */
    readerRole: ChatRole;
}): Promise<void> {
    const otherRole: ChatRole = opts.readerRole === "client" ? "trainer" : "client";
    await db
        .update(chat_messages)
        .set({ read_at: new Date() })
        .where(
            and(
                eq(chat_messages.trainer_id, opts.trainerId),
                eq(chat_messages.client_id, opts.clientId),
                eq(chat_messages.sender_role, otherRole),
                isNull(chat_messages.read_at)
            )
        );
}

/** Numero messaggi non letti per il cliente loggato. */
export async function countUnreadForClient(session: ClientSession): Promise<number> {
    const [row] = await db
        .select({ n: count() })
        .from(chat_messages)
        .where(
            and(
                eq(chat_messages.client_id, session.id),
                eq(chat_messages.trainer_id, session.trainer_id),
                eq(chat_messages.sender_role, "trainer"),
                isNull(chat_messages.read_at)
            )
        );
    return row?.n ?? 0;
}

/**
 * Conversazione del cliente mobile: ritorna gli ultimi N messaggi
 * (ordine cronologico ascendente: i più vecchi per primi, comodo per UI).
 */
export async function getClientConversation(
    session: ClientSession,
    opts: { limit?: number; beforeId?: number } = {}
): Promise<ChatMessageRow[]> {
    const rows = await listConversationMessages({
        trainerId: session.trainer_id,
        clientId: session.id,
        limit: opts.limit,
        beforeId: opts.beforeId,
    });
    // Inverti per ordine cronologico asc
    return rows.reverse();
}

/**
 * Messaggi dopo un certo id (per SSE polling fallback).
 */
export async function getMessagesSince(opts: {
    trainerId: number;
    clientId: number;
    afterId: number;
}): Promise<ChatMessageRow[]> {
    return db
        .select()
        .from(chat_messages)
        .where(
            and(
                eq(chat_messages.trainer_id, opts.trainerId),
                eq(chat_messages.client_id, opts.clientId),
                // afterId esplicito senza usare gt: id > afterId
            )
        )
        .orderBy(asc(chat_messages.id))
        .then((rows) => rows.filter((r) => r.id > opts.afterId));
}
