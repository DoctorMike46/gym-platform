"use server"

import { db } from "@/db";
import { clients, subscriptions, services } from "@/db/schema";
import { count, eq, and, sql, desc } from "drizzle-orm";
import { getAuthenticatedTrainer } from "@/lib/auth";

export async function getDashboardStats() {
    const trainer = await getAuthenticatedTrainer();
    try {
        // Total active clients (those with at least one active subscription)
        const activeClientsResult = await db
            .select({ val: sql<number>`count(distinct ${clients.id})` })
            .from(clients)
            .innerJoin(subscriptions, eq(clients.id, subscriptions.client_id))
            .where(and(
                eq(clients.trainer_id, trainer.id),
                eq(subscriptions.status, "attivo")
            ));

        // Subscriptions expiring soon (next 14 days)
        const expiringSoonResult = await db
            .select({ val: count(subscriptions.id) })
            .from(subscriptions)
            .innerJoin(clients, eq(subscriptions.client_id, clients.id))
            .where(
                and(
                    eq(clients.trainer_id, trainer.id),
                    eq(subscriptions.status, "attivo"),
                    sql`${subscriptions.data_fine} <= CURRENT_DATE + INTERVAL '14 days'`,
                    sql`${subscriptions.data_fine} >= CURRENT_DATE`
                )
            );

        // New clients this month
        const newClientsThisMonthResult = await db
            .select({ val: count(clients.id) })
            .from(clients)
            .where(and(
                eq(clients.trainer_id, trainer.id),
                sql`EXTRACT(MONTH FROM ${clients.created_at}) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM ${clients.created_at}) = EXTRACT(YEAR FROM CURRENT_DATE)`
            ));

        // Estimated monthly revenue
        const revenueResult = await db
            .select({ total: sql<number>`COALESCE(SUM(${services.prezzo}), 0)` })
            .from(subscriptions)
            .innerJoin(clients, eq(subscriptions.client_id, clients.id))
            .innerJoin(services, eq(subscriptions.service_id, services.id))
            .where(and(
                eq(clients.trainer_id, trainer.id),
                eq(subscriptions.status, "attivo")
            ));

        // Top services
        const topServices = await db
            .select({
                name: services.nome_servizio,
                count: count(subscriptions.id),
            })
            .from(subscriptions)
            .innerJoin(clients, eq(subscriptions.client_id, clients.id))
            .innerJoin(services, eq(subscriptions.service_id, services.id))
            .where(and(
                eq(clients.trainer_id, trainer.id),
                eq(subscriptions.status, "attivo")
            ))
            .groupBy(services.nome_servizio)
            .orderBy(desc(sql`count(*)`))
            .limit(5);

        // Expiring clients
        const expiringClients = await db
            .select({
                clientName: sql<string>`${clients.nome} || ' ' || ${clients.cognome}`,
                serviceName: services.nome_servizio,
                expiryDate: subscriptions.data_fine,
            })
            .from(subscriptions)
            .innerJoin(clients, eq(subscriptions.client_id, clients.id))
            .innerJoin(services, eq(subscriptions.service_id, services.id))
            .where(
                and(
                    eq(clients.trainer_id, trainer.id),
                    eq(subscriptions.status, "attivo"),
                    sql`${subscriptions.data_fine} <= CURRENT_DATE + INTERVAL '14 days'`,
                    sql`${subscriptions.data_fine} >= CURRENT_DATE`
                )
            )
            .orderBy(subscriptions.data_fine)
            .limit(5);

        // Total clients
        const totalClientsResult = await db
            .select({ val: count(clients.id) })
            .from(clients)
            .where(eq(clients.trainer_id, trainer.id));

        // Monthly growth
        const monthlyGrowth = await db
            .select({
                month: sql<string>`TO_CHAR(${clients.created_at}, 'YYYY-MM')`,
                count: count(clients.id),
            })
            .from(clients)
            .where(and(
                eq(clients.trainer_id, trainer.id),
                sql`${clients.created_at} >= CURRENT_DATE - INTERVAL '6 months'`
            ))
            .groupBy(sql`TO_CHAR(${clients.created_at}, 'YYYY-MM')`)
            .orderBy(sql`TO_CHAR(${clients.created_at}, 'YYYY-MM')`);

        // Churn: subscriptions that expired this month
        const expiredThisMonthResult = await db
            .select({ val: count(subscriptions.id) })
            .from(subscriptions)
            .innerJoin(clients, eq(subscriptions.client_id, clients.id))
            .where(
                and(
                    eq(clients.trainer_id, trainer.id),
                    eq(subscriptions.status, "scaduto"),
                    sql`EXTRACT(MONTH FROM ${subscriptions.data_fine}) = EXTRACT(MONTH FROM CURRENT_DATE)`,
                    sql`EXTRACT(YEAR FROM ${subscriptions.data_fine}) = EXTRACT(YEAR FROM CURRENT_DATE)`
                )
            );

        // New subscriptions this month
        const newSubsThisMonthResult = await db
            .select({ val: count(subscriptions.id) })
            .from(subscriptions)
            .innerJoin(clients, eq(subscriptions.client_id, clients.id))
            .where(
                and(
                    eq(clients.trainer_id, trainer.id),
                    eq(subscriptions.status, "attivo"),
                    sql`EXTRACT(MONTH FROM ${subscriptions.data_inizio}) = EXTRACT(MONTH FROM CURRENT_DATE)`,
                    sql`EXTRACT(YEAR FROM ${subscriptions.data_inizio}) = EXTRACT(YEAR FROM CURRENT_DATE)`
                )
            );

        // Format monthly growth with Italian month names
        const monthNames: Record<string, string> = {
            '01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Apr',
            '05': 'Mag', '06': 'Giu', '07': 'Lug', '08': 'Ago',
            '09': 'Set', '10': 'Ott', '11': 'Nov', '12': 'Dic'
        };

        const growthData = monthlyGrowth.map(m => ({
            month: monthNames[m.month.split('-')[1]] || m.month,
            clienti: m.count,
        }));

        return {
            activeClients: Number(activeClientsResult[0]?.val || 0),
            expiringSoon: Number(expiringSoonResult[0]?.val || 0),
            newClients: Number(newClientsThisMonthResult[0]?.val || 0),
            totalClients: Number(totalClientsResult[0]?.val || 0),
            estimatedRevenue: Number(revenueResult[0]?.total || 0),
            topServices: topServices.map(s => ({
                name: s.name || "Sconosciuto",
                count: Number(s.count),
            })),
            expiringClients: expiringClients.map(c => ({
                clientName: c.clientName,
                serviceName: c.serviceName || "-",
                expiryDate: c.expiryDate,
            })),
            monthlyGrowth: growthData,
            churn: {
                expiredThisMonth: Number(expiredThisMonthResult[0]?.val || 0),
                newSubsThisMonth: Number(newSubsThisMonthResult[0]?.val || 0),
            },
        };
    } catch (error) {
        console.error("Errore fetch stats:", error);
        return {
            activeClients: 0,
            expiringSoon: 0,
            newClients: 0,
            totalClients: 0,
            estimatedRevenue: 0,
            topServices: [],
            expiringClients: [],
            monthlyGrowth: [],
            churn: { expiredThisMonth: 0, newSubsThisMonth: 0 },
        };
    }
}
