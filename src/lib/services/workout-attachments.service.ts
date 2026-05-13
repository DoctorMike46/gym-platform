import { db } from "@/db";
import {
    clients,
    workout_exercise_log_attachments,
    workout_exercise_logs,
    workout_logs,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { ClientSession } from "@/lib/client-auth";
import {
    deleteFromR2,
    generateWorkoutAttachmentKey,
    getR2SignedUploadUrl,
} from "@/lib/r2";

// ───────────────────────── Costanti / policy ─────────────────────────

export const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
]);

export const ALLOWED_VIDEO_TYPES = new Set([
    "video/mp4",
    "video/quicktime",
]);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_ATTACHMENTS_PER_EXERCISE_LOG = 6;

export function kindFromMime(mime: string): "image" | "video" | null {
    if (ALLOWED_IMAGE_TYPES.has(mime)) return "image";
    if (ALLOWED_VIDEO_TYPES.has(mime)) return "video";
    return null;
}

// ───────────────────────── Ownership helper ─────────────────────────

/**
 * Verifica che il client_id sia proprietario dell'exercise log indicato e
 * ne ritorna il workout_log padre (con trainer_id).
 */
export async function ensureExerciseLogOwnership(
    exerciseLogId: number,
    clientId: number
): Promise<{
    exerciseLogId: number;
    workoutLogId: number;
    trainerId: number;
}> {
    const [row] = await db
        .select({
            exerciseLogId: workout_exercise_logs.id,
            workoutLogId: workout_logs.id,
            clientId: workout_logs.client_id,
        })
        .from(workout_exercise_logs)
        .innerJoin(
            workout_logs,
            eq(workout_logs.id, workout_exercise_logs.workout_log_id)
        )
        .where(eq(workout_exercise_logs.id, exerciseLogId))
        .limit(1);

    if (!row || row.clientId !== clientId) {
        throw new Error("Esercizio log non trovato");
    }

    const [c] = await db
        .select({ trainer_id: clients.trainer_id })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);
    if (!c) throw new Error("Cliente non trovato");

    return {
        exerciseLogId: row.exerciseLogId,
        workoutLogId: row.workoutLogId,
        trainerId: c.trainer_id,
    };
}

// ───────────────────────── Presign ─────────────────────────

export interface PresignInput {
    exerciseLogId: number;
    filename: string;
    contentType: string;
    sizeBytes?: number;
}

export interface PresignResult {
    upload_url: string;
    r2_key: string;
    headers: Record<string, string>;
    kind: "image" | "video";
    expires_in: number;
}

export async function createAttachmentPresign(
    session: ClientSession,
    input: PresignInput
): Promise<PresignResult> {
    const kind = kindFromMime(input.contentType);
    if (!kind) {
        throw new Error("Formato non supportato");
    }
    if (kind === "image" && input.sizeBytes && input.sizeBytes > MAX_IMAGE_BYTES) {
        throw new Error("Foto troppo grande (max 10 MB)");
    }
    if (kind === "video" && input.sizeBytes && input.sizeBytes > MAX_VIDEO_BYTES) {
        throw new Error("Video troppo grande (max 50 MB)");
    }

    await ensureExerciseLogOwnership(input.exerciseLogId, session.id);

    // Quota: max N allegati per riga
    const existing = await db
        .select({ id: workout_exercise_log_attachments.id })
        .from(workout_exercise_log_attachments)
        .where(
            eq(
                workout_exercise_log_attachments.exercise_log_id,
                input.exerciseLogId
            )
        );
    if (existing.length >= MAX_ATTACHMENTS_PER_EXERCISE_LOG) {
        throw new Error(
            `Massimo ${MAX_ATTACHMENTS_PER_EXERCISE_LOG} allegati per esercizio`
        );
    }

    const r2Key = generateWorkoutAttachmentKey(
        session.id,
        input.exerciseLogId,
        input.filename
    );
    const uploadUrl = await getR2SignedUploadUrl({
        key: r2Key,
        contentType: input.contentType,
        expiresIn: 600,
    });

    return {
        upload_url: uploadUrl,
        r2_key: r2Key,
        headers: { "Content-Type": input.contentType },
        kind,
        expires_in: 600,
    };
}

// ───────────────────────── Create row ─────────────────────────

export interface ConfirmInput {
    exerciseLogId: number;
    r2Key: string;
    mimeType: string;
    filename?: string;
    sizeBytes?: number;
    durationSeconds?: number;
}

export async function confirmAttachment(
    session: ClientSession,
    input: ConfirmInput
): Promise<{ id: number }> {
    const kind = kindFromMime(input.mimeType);
    if (!kind) throw new Error("Formato non supportato");

    // Verifica ownership + ricava trainer_id
    const ctx = await ensureExerciseLogOwnership(
        input.exerciseLogId,
        session.id
    );

    // Verifica che la r2_key inizi col path atteso per il cliente
    const expectedPrefix = `clients/${session.id}/workouts/${input.exerciseLogId}/`;
    if (!input.r2Key.startsWith(expectedPrefix)) {
        throw new Error("R2 key non valida");
    }

    const [row] = await db
        .insert(workout_exercise_log_attachments)
        .values({
            exercise_log_id: ctx.exerciseLogId,
            client_id: session.id,
            trainer_id: ctx.trainerId,
            r2_key: input.r2Key,
            mime_type: input.mimeType,
            kind,
            filename: input.filename ?? null,
            size_bytes: input.sizeBytes ?? null,
            duration_seconds: input.durationSeconds ?? null,
        })
        .returning({ id: workout_exercise_log_attachments.id });

    return { id: row.id };
}

// ───────────────────────── Delete ─────────────────────────

export async function deleteAttachment(
    session: ClientSession,
    attachmentId: number
): Promise<void> {
    const [row] = await db
        .select({
            id: workout_exercise_log_attachments.id,
            r2_key: workout_exercise_log_attachments.r2_key,
            client_id: workout_exercise_log_attachments.client_id,
        })
        .from(workout_exercise_log_attachments)
        .where(eq(workout_exercise_log_attachments.id, attachmentId))
        .limit(1);

    if (!row || row.client_id !== session.id) {
        throw new Error("Allegato non trovato");
    }

    await db
        .delete(workout_exercise_log_attachments)
        .where(eq(workout_exercise_log_attachments.id, attachmentId));

    try {
        await deleteFromR2(row.r2_key);
    } catch (e) {
        // Best effort. La riga DB è già stata cancellata.
        console.warn("[workout-attachment] R2 delete failed", row.r2_key, e);
    }
}

// ───────────────────────── List ─────────────────────────

export type AttachmentRow = {
    id: number;
    exercise_log_id: number;
    r2_key: string;
    mime_type: string;
    kind: string;
    filename: string | null;
    size_bytes: number | null;
    duration_seconds: number | null;
    uploaded_at: Date;
};

/**
 * Lista allegati per N exercise_log_id in una query (usato per bulk
 * embedding in session detail / history).
 */
export async function listAttachmentsForExerciseLogs(
    exerciseLogIds: number[]
): Promise<Record<number, AttachmentRow[]>> {
    if (exerciseLogIds.length === 0) return {};
    const rows = await db
        .select()
        .from(workout_exercise_log_attachments)
        .where(
            inArray(
                workout_exercise_log_attachments.exercise_log_id,
                exerciseLogIds
            )
        );
    const out: Record<number, AttachmentRow[]> = {};
    for (const r of rows) {
        const arr = out[r.exercise_log_id] ?? [];
        arr.push({
            id: r.id,
            exercise_log_id: r.exercise_log_id,
            r2_key: r.r2_key,
            mime_type: r.mime_type,
            kind: r.kind,
            filename: r.filename,
            size_bytes: r.size_bytes,
            duration_seconds: r.duration_seconds,
            uploaded_at: r.uploaded_at,
        });
        out[r.exercise_log_id] = arr;
    }
    return out;
}

/**
 * Variante con ownership check su client_id (per il cliente).
 */
export async function listClientExerciseLogAttachments(
    clientId: number,
    exerciseLogId: number
): Promise<AttachmentRow[]> {
    const rows = await db
        .select()
        .from(workout_exercise_log_attachments)
        .where(
            and(
                eq(
                    workout_exercise_log_attachments.exercise_log_id,
                    exerciseLogId
                ),
                eq(workout_exercise_log_attachments.client_id, clientId)
            )
        );
    return rows.map((r) => ({
        id: r.id,
        exercise_log_id: r.exercise_log_id,
        r2_key: r.r2_key,
        mime_type: r.mime_type,
        kind: r.kind,
        filename: r.filename,
        size_bytes: r.size_bytes,
        duration_seconds: r.duration_seconds,
        uploaded_at: r.uploaded_at,
    }));
}
