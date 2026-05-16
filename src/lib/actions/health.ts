"use server";

import { db } from "@/db";
import { clients } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthenticatedTrainer } from "@/lib/auth";
import {
    listClientHealthSamples,
    listLatestHealthSamples,
    type HealthSampleType,
    type StoredSample,
} from "@/lib/services/health-samples.service";

async function assertClientOwnership(trainerId: number, clientId: number) {
    const [c] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.trainer_id, trainerId)))
        .limit(1);
    if (!c) throw new Error("Cliente non autorizzato");
}

export interface ClientHealthSnapshot {
    samples: StoredSample[];
    latest: Partial<Record<HealthSampleType, StoredSample>>;
}

/**
 * Ritorna gli ultimi N giorni di campioni salute per il cliente,
 * + snapshot ultimi valori per tipo. Per la detail page admin.
 */
export async function getClientHealthSnapshot(
    clientId: number,
    days = 30,
): Promise<ClientHealthSnapshot | null> {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertClientOwnership(trainer.id, clientId);
    } catch {
        return null;
    }
    const [samples, latest] = await Promise.all([
        listClientHealthSamples(clientId, days),
        listLatestHealthSamples(clientId),
    ]);
    return { samples, latest };
}
