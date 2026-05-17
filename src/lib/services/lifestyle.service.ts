import { db } from "@/db";
import { client_lifestyle, clients } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { decryptOptional, encryptOptional } from "@/lib/crypto";
import { logAudit, type AuditActor } from "@/lib/audit-log";

export const FUMO_VALUES = ["no", "si", "ex"] as const;
export type Fumo = typeof FUMO_VALUES[number];

export interface Integratore {
    nome: string;
    dosaggio?: string | null;
}

export interface LifestyleData {
    client_id: number;
    ore_sonno_medie: number | null;
    livello_stress: number | null;
    n_pasti_die: number | null;
    orari_pasti: string[] | null;
    occasioni_sociali_settimana: number | null;
    consumo_acqua_litri: string | null;
    fumo: Fumo | null;
    integratori: Integratore[] | null;
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

function safeDecrypt(value: string | null | undefined): string | null {
    try {
        return decryptOptional(value);
    } catch (err) {
        console.error("[lifestyle] decrypt failed", { err });
        return null;
    }
}

export async function getLifestyle(
    clientId: number,
    actor: AuditActor
): Promise<LifestyleData> {
    const [row] = await db
        .select()
        .from(client_lifestyle)
        .where(eq(client_lifestyle.client_id, clientId))
        .limit(1);

    await logAudit({
        actor,
        action: "lifestyle.read",
        resourceType: "client_lifestyle",
        resourceId: row?.id,
        clientId,
    });

    if (!row) {
        return {
            client_id: clientId,
            ore_sonno_medie: null,
            livello_stress: null,
            n_pasti_die: null,
            orari_pasti: null,
            occasioni_sociali_settimana: null,
            consumo_acqua_litri: null,
            fumo: null,
            integratori: null,
            updated_at: null,
        };
    }

    const consumo_acqua_litri = safeDecrypt(row.consumo_acqua_litri_enc) ?? row.consumo_acqua_litri;

    return {
        client_id: clientId,
        ore_sonno_medie: row.ore_sonno_medie,
        livello_stress: row.livello_stress,
        n_pasti_die: row.n_pasti_die,
        orari_pasti: (row.orari_pasti as string[] | null) ?? null,
        occasioni_sociali_settimana: row.occasioni_sociali_settimana,
        consumo_acqua_litri,
        fumo: row.fumo as Fumo | null,
        integratori: (row.integratori as Integratore[] | null) ?? null,
        updated_at: row.updated_at,
    };
}

export interface UpsertLifestyleInput {
    ore_sonno_medie?: number | null;
    livello_stress?: number | null;
    n_pasti_die?: number | null;
    orari_pasti?: string[] | null;
    occasioni_sociali_settimana?: number | null;
    consumo_acqua_litri?: string | null;
    fumo?: Fumo | null;
    integratori?: Integratore[] | null;
}

export async function upsertLifestyle(
    clientId: number,
    trainerId: number,
    input: UpsertLifestyleInput,
    actor: AuditActor
): Promise<LifestyleData> {
    await assertOwnership(clientId, trainerId);

    if (input.livello_stress !== undefined && input.livello_stress !== null) {
        if (input.livello_stress < 1 || input.livello_stress > 10) {
            throw new Error("invalid_livello_stress");
        }
    }
    if (input.fumo !== undefined && input.fumo !== null && !FUMO_VALUES.includes(input.fumo)) {
        throw new Error("invalid_fumo");
    }

    const [existing] = await db
        .select({ id: client_lifestyle.id })
        .from(client_lifestyle)
        .where(eq(client_lifestyle.client_id, clientId))
        .limit(1);

    const patch = {
        ...(input.ore_sonno_medie !== undefined ? { ore_sonno_medie: input.ore_sonno_medie } : {}),
        ...(input.livello_stress !== undefined ? { livello_stress: input.livello_stress } : {}),
        ...(input.n_pasti_die !== undefined ? { n_pasti_die: input.n_pasti_die } : {}),
        ...(input.orari_pasti !== undefined ? { orari_pasti: input.orari_pasti } : {}),
        ...(input.occasioni_sociali_settimana !== undefined
            ? { occasioni_sociali_settimana: input.occasioni_sociali_settimana }
            : {}),
        ...(input.consumo_acqua_litri !== undefined
            ? {
                  consumo_acqua_litri: input.consumo_acqua_litri,
                  consumo_acqua_litri_enc: encryptOptional(input.consumo_acqua_litri),
              }
            : {}),
        ...(input.fumo !== undefined ? { fumo: input.fumo } : {}),
        ...(input.integratori !== undefined ? { integratori: input.integratori } : {}),
    };

    if (existing) {
        await db
            .update(client_lifestyle)
            .set({ ...patch, updated_at: new Date() })
            .where(eq(client_lifestyle.id, existing.id));
    } else {
        await db.insert(client_lifestyle).values({
            client_id: clientId,
            trainer_id: trainerId,
            ...patch,
        });
    }

    await logAudit({
        actor,
        action: "lifestyle.write",
        resourceType: "client_lifestyle",
        resourceId: existing?.id,
        clientId,
        metadata: { op: existing ? "update" : "create", fields: Object.keys(input) },
    });

    return getLifestyle(clientId, actor);
}
