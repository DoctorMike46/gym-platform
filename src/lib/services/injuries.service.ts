import "server-only";

import { db } from "@/db";
import { client_injuries, clients } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { decryptOptional, encryptOptional } from "@/lib/crypto";
import { logAudit, type AuditActor } from "@/lib/audit-log";
import {
    BODY_PARTS,
    INJURY_GRAVITA,
    INJURY_STATO,
    INJURY_TYPES,
} from "./injuries.types";
import type {
    BodyPart,
    ClientInjury,
    CreateInjuryInput,
    InjuryGravita,
    InjuryStato,
    InjuryType,
    UpdateInjuryInput,
} from "./injuries.types";

interface ListOpts {
    onlyActive?: boolean;
}

/**
 * Verifica che il cliente appartenga al trainer indicato (multi-tenancy).
 * Lancia se la coppia (client_id, trainer_id) non esiste.
 */
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

function mapRow(row: typeof client_injuries.$inferSelect): ClientInjury {
    let note: string | null = null;
    try {
        note = decryptOptional(row.note_enc);
    } catch (err) {
        console.error("[injuries] decrypt failed", { id: row.id, err });
    }
    return {
        id: row.id,
        client_id: row.client_id,
        parte_corpo: row.parte_corpo as BodyPart,
        tipo: row.tipo as InjuryType | null,
        gravita: row.gravita as InjuryGravita,
        stato: row.stato as InjuryStato,
        data_evento: row.data_evento,
        data_recupero: row.data_recupero,
        note,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export async function listInjuriesByClient(
    clientId: number,
    actor: AuditActor,
    opts: ListOpts = {}
): Promise<ClientInjury[]> {
    const conds = [eq(client_injuries.client_id, clientId)];
    if (opts.onlyActive) conds.push(eq(client_injuries.stato, "attivo"));

    const rows = await db
        .select()
        .from(client_injuries)
        .where(and(...conds))
        .orderBy(desc(client_injuries.created_at));

    await logAudit({
        actor,
        action: "injury.read",
        resourceType: "client_injuries",
        clientId,
        metadata: { count: rows.length, only_active: opts.onlyActive ?? false },
    });

    return rows.map(mapRow);
}

export async function createInjury(
    clientId: number,
    trainerId: number,
    input: CreateInjuryInput,
    actor: AuditActor
): Promise<ClientInjury> {
    await assertOwnership(clientId, trainerId);

    if (!BODY_PARTS.includes(input.parte_corpo)) {
        throw new Error("invalid_parte_corpo");
    }
    if (!INJURY_GRAVITA.includes(input.gravita)) {
        throw new Error("invalid_gravita");
    }
    if (input.tipo && !INJURY_TYPES.includes(input.tipo)) {
        throw new Error("invalid_tipo");
    }
    const stato = input.stato ?? "attivo";
    if (!INJURY_STATO.includes(stato)) {
        throw new Error("invalid_stato");
    }

    const [row] = await db
        .insert(client_injuries)
        .values({
            client_id: clientId,
            trainer_id: trainerId,
            parte_corpo: input.parte_corpo,
            tipo: input.tipo ?? null,
            gravita: input.gravita,
            stato,
            data_evento: input.data_evento ?? null,
            data_recupero: input.data_recupero ?? null,
            note_enc: encryptOptional(input.note ?? null),
        })
        .returning();

    await logAudit({
        actor,
        action: "injury.write",
        resourceType: "client_injuries",
        resourceId: row.id,
        clientId,
        metadata: { op: "create", parte_corpo: input.parte_corpo, gravita: input.gravita },
    });

    return mapRow(row);
}

export async function updateInjury(
    injuryId: number,
    clientId: number,
    trainerId: number,
    input: UpdateInjuryInput,
    actor: AuditActor
): Promise<ClientInjury> {
    await assertOwnership(clientId, trainerId);

    const patch: Partial<typeof client_injuries.$inferInsert> = {
        updated_at: new Date(),
    };
    if (input.parte_corpo !== undefined) {
        if (!BODY_PARTS.includes(input.parte_corpo)) throw new Error("invalid_parte_corpo");
        patch.parte_corpo = input.parte_corpo;
    }
    if (input.gravita !== undefined) {
        if (!INJURY_GRAVITA.includes(input.gravita)) throw new Error("invalid_gravita");
        patch.gravita = input.gravita;
    }
    if (input.tipo !== undefined) {
        if (input.tipo && !INJURY_TYPES.includes(input.tipo)) throw new Error("invalid_tipo");
        patch.tipo = input.tipo;
    }
    if (input.stato !== undefined) {
        if (!INJURY_STATO.includes(input.stato)) throw new Error("invalid_stato");
        patch.stato = input.stato;
        if (input.stato === "recuperato" && input.data_recupero === undefined) {
            patch.data_recupero = new Date().toISOString().slice(0, 10);
        }
    }
    if (input.data_evento !== undefined) patch.data_evento = input.data_evento;
    if (input.data_recupero !== undefined) patch.data_recupero = input.data_recupero;
    if (input.note !== undefined) patch.note_enc = encryptOptional(input.note);

    const [row] = await db
        .update(client_injuries)
        .set(patch)
        .where(
            and(
                eq(client_injuries.id, injuryId),
                eq(client_injuries.client_id, clientId)
            )
        )
        .returning();

    if (!row) throw new Error("injury_not_found");

    await logAudit({
        actor,
        action: "injury.write",
        resourceType: "client_injuries",
        resourceId: row.id,
        clientId,
        metadata: { op: "update", fields: Object.keys(input) },
    });

    return mapRow(row);
}

export async function deleteInjury(
    injuryId: number,
    clientId: number,
    trainerId: number,
    actor: AuditActor
): Promise<void> {
    await assertOwnership(clientId, trainerId);

    const result = await db
        .delete(client_injuries)
        .where(
            and(
                eq(client_injuries.id, injuryId),
                eq(client_injuries.client_id, clientId)
            )
        )
        .returning({ id: client_injuries.id });

    if (result.length === 0) throw new Error("injury_not_found");

    await logAudit({
        actor,
        action: "injury.delete",
        resourceType: "client_injuries",
        resourceId: injuryId,
        clientId,
        metadata: { op: "delete" },
    });
}

/**
 * Conta gli infortuni attivi (per banner builder + counter UI).
 */
export async function countActiveInjuries(clientId: number): Promise<number> {
    const rows = await db
        .select({ id: client_injuries.id })
        .from(client_injuries)
        .where(
            and(
                eq(client_injuries.client_id, clientId),
                eq(client_injuries.stato, "attivo")
            )
        );
    return rows.length;
}
