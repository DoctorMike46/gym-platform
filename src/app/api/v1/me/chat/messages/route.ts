import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    getClientConversation,
    insertChatMessage,
    markConversationRead,
} from "@/lib/services/chat.service";

export const runtime = "nodejs";

/**
 * GET /api/v1/me/chat/messages?limit=50&before_id=123
 * Ritorna messaggi in ordine cronologico ascendente.
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const beforeIdStr = url.searchParams.get("before_id");
    const beforeId = beforeIdStr ? parseInt(beforeIdStr, 10) : undefined;

    const messages = await getClientConversation(auth.session, {
        limit: Number.isFinite(limit) ? limit : 50,
        beforeId: beforeId && Number.isFinite(beforeId) ? beforeId : undefined,
    });
    return jsonOk({ messages });
}

interface CreateBody {
    body?: string;
    attachment_r2_key?: string;
    attachment_mime_type?: string;
}

/**
 * POST /api/v1/me/chat/messages
 * Il cliente invia un messaggio al trainer.
 */
export async function POST(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;
    let body: CreateBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }
    const text = (body.body ?? "").trim();
    if (!text && !body.attachment_r2_key) {
        return jsonError("empty_message", "Messaggio vuoto", 400);
    }
    if (text.length > 4000) {
        return jsonError("too_long", "Messaggio troppo lungo (max 4000)", 400);
    }
    const message = await insertChatMessage({
        trainerId: auth.session.trainer_id,
        clientId: auth.session.id,
        senderRole: "client",
        body: text,
        attachmentR2Key: body.attachment_r2_key,
        attachmentMimeType: body.attachment_mime_type,
    });
    return jsonOk({ message }, 201);
}

/**
 * POST /api/v1/me/chat/messages/read
 * (alias: PATCH /api/v1/me/chat/messages)
 * Marca come letti tutti i messaggi del trainer per la conversazione.
 */
export async function PATCH(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;
    await markConversationRead({
        trainerId: auth.session.trainer_id,
        clientId: auth.session.id,
        readerRole: "client",
    });
    return jsonOk({ success: true });
}
