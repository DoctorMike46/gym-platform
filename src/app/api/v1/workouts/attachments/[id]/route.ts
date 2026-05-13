import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { deleteAttachment } from "@/lib/services/workout-attachments.service";

export const runtime = "nodejs";

/**
 * DELETE — elimina un allegato (R2 + DB row).
 */
export async function DELETE(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const { id } = await ctx.params;
    const attachmentId = Number(id);
    if (!Number.isFinite(attachmentId)) {
        return jsonError("invalid_id", "id non valido", 400);
    }

    try {
        await deleteAttachment(auth.session, attachmentId);
        return jsonOk({ deleted: true });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Errore";
        return jsonError("delete_failed", message, 404);
    }
}
