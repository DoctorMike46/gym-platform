"use server"

import { db } from "@/db";
import { clients, subscriptions, services } from "@/db/schema";
import { count, eq, and, gt, sql } from "drizzle-orm";

export async function getDashboardStats() {
    try {
        // Total active clients (those with an active subscription)
        const activeClientsCount = await db
            .select({ val: count() })
            .from(clients)
            .leftJoin(subscriptions, eq(clients.id, subscriptions.client_id))
            .where(eq(subscriptions.status, "attivo"));

        // Subscriptions expiring soon (e.g., in the next 14 days)
        const expiringSoonCount = await db
            .select({ val: count() })
            .from(subscriptions)
            .where(
                and(
                    eq(subscriptions.status, "attivo"),
                    sql`${subscriptions.data_fine} <= CURRENT_DATE + INTERVAL '14 days'`,
                    sql`${subscriptions.data_fine} >= CURRENT_DATE`
                )
            );

        // New clients this month
        const newClientsThisMonth = await db
            .select({ val: count() })
            .from(clients)
            .where(sql`EXTRACT(MONTH FROM ${clients.created_at}) = EXTRACT(MONTH FROM CURRENT_DATE)`);

        return {
            activeClients: activeClientsCount[0].val,
            expiringSoon: expiringSoonCount[0].val,
            newClients: newClientsThisMonth[0].val,
        };
    } catch (error) {
        console.error("Errore fetch stats:", error);
        return {
            activeClients: 0,
            expiringSoon: 0,
            newClients: 0,
        };
    }
}
