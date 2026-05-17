import { db } from "@/db";
import { client_medical_history, clients } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { decryptOptional, encryptOptional } from "@/lib/crypto";
import { logAudit, type AuditActor } from "@/lib/audit-log";

export interface MedicalHistory {
    client_id: number;
    patologie: string | null;
    farmaci: string | null;
    note: string | null;
    disclaimer_accepted_at: Date | null;
    updated_at: Date | null;
}

async function assertOwnership(clientId: number, trainerId: number): Promise<void> {
    const [row] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(
            and(
                eq(clients.id, clientId),
                eq(clients.trainer_id, trainerId),
                isNull(clients.deleted_at)
            )
        )
        .limit(1);
    if (!row) throw new Error("client_not_found_or_not_owned");
}

function safeDecrypt(value: string | null | undefined, ctx: { id: number; field: string }): string | null {
    try {
        return decryptOptional(value);
    } catch (err) {
        console.error("[medical] decrypt failed", { ...ctx, err });
        return null;
    }
}

/**
 * Ritorna lo storico medico decifrato del cliente. Loggata sempre (art.9).
 * Ritorna oggetto vuoto se nessun record esiste ancora.
 */
export async function getMedicalHistory(
    clientId: number,
    actor: AuditActor
): Promise<MedicalHistory> {
    const [row] = await db
        .select()
        .from(client_medical_history)
        .where(eq(client_medical_history.client_id, clientId))
        .limit(1);

    await logAudit({
        actor,
        action: "medical.read",
        resourceType: "client_medical_history",
        resourceId: row?.id,
        clientId,
    });

    if (!row) {
        return {
            client_id: clientId,
            patologie: null,
            farmaci: null,
            note: null,
            disclaimer_accepted_at: null,
            updated_at: null,
        };
    }

    return {
        client_id: clientId,
        patologie: safeDecrypt(row.patologie_enc, { id: row.id, field: "patologie" }),
        farmaci: safeDecrypt(row.farmaci_enc, { id: row.id, field: "farmaci" }),
        note: safeDecrypt(row.note_enc, { id: row.id, field: "note" }),
        disclaimer_accepted_at: row.disclaimer_accepted_at,
        updated_at: row.updated_at,
    };
}

export interface UpsertMedicalInput {
    patologie?: string | null;
    farmaci?: string | null;
    note?: string | null;
    accept_disclaimer?: boolean;
}

/**
 * Upsert dello storico medico. Cifra tutti i campi.
 * Il disclaimer GDPR è obbligatorio: se non già accettato e accept_disclaimer è false, lancia.
 */
export async function upsertMedicalHistory(
    clientId: number,
    trainerId: number,
    input: UpsertMedicalInput,
    actor: AuditActor
): Promise<MedicalHistory> {
    await assertOwnership(clientId, trainerId);

    const [existing] = await db
        .select({
            id: client_medical_history.id,
            disclaimer_accepted_at: client_medical_history.disclaimer_accepted_at,
        })
        .from(client_medical_history)
        .where(eq(client_medical_history.client_id, clientId))
        .limit(1);

    const needsDisclaimer = !existing?.disclaimer_accepted_at;
    if (needsDisclaimer && !input.accept_disclaimer) {
        throw new Error("disclaimer_required");
    }

    const patologie_enc =
        input.patologie !== undefined ? encryptOptional(input.patologie) : undefined;
    const farmaci_enc =
        input.farmaci !== undefined ? encryptOptional(input.farmaci) : undefined;
    const note_enc =
        input.note !== undefined ? encryptOptional(input.note) : undefined;

    const disclaimer_accepted_at = needsDisclaimer ? new Date() : undefined;

    if (existing) {
        await db
            .update(client_medical_history)
            .set({
                ...(patologie_enc !== undefined ? { patologie_enc } : {}),
                ...(farmaci_enc !== undefined ? { farmaci_enc } : {}),
                ...(note_enc !== undefined ? { note_enc } : {}),
                ...(disclaimer_accepted_at !== undefined ? { disclaimer_accepted_at } : {}),
                updated_at: new Date(),
            })
            .where(eq(client_medical_history.id, existing.id));
    } else {
        await db.insert(client_medical_history).values({
            client_id: clientId,
            trainer_id: trainerId,
            patologie_enc: patologie_enc ?? null,
            farmaci_enc: farmaci_enc ?? null,
            note_enc: note_enc ?? null,
            disclaimer_accepted_at: disclaimer_accepted_at ?? null,
        });
    }

    await logAudit({
        actor,
        action: "medical.write",
        resourceType: "client_medical_history",
        resourceId: existing?.id,
        clientId,
        metadata: {
            op: existing ? "update" : "create",
            fields: Object.keys(input).filter((k) => k !== "accept_disclaimer"),
            disclaimer_now_accepted: needsDisclaimer,
        },
    });

    return getMedicalHistory(clientId, actor);
}

/**
 * Verifica esistenza disclaimer accettato senza decifrare nulla.
 * Usato per gating endpoint POST nutrition request.
 */
export async function hasAcceptedMedicalDisclaimer(clientId: number): Promise<boolean> {
    const [row] = await db
        .select({ disclaimer_accepted_at: client_medical_history.disclaimer_accepted_at })
        .from(client_medical_history)
        .where(eq(client_medical_history.client_id, clientId))
        .limit(1);
    return !!row?.disclaimer_accepted_at;
}

// Suppress unused-import warning in case sql helper is needed in future migrations
void sql;
