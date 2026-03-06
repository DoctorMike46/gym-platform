"use server"

import { db } from "@/db";
import { clients, subscriptions, services } from "@/db/schema";
import { count, eq, and, sql, desc } from "drizzle-orm";

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
            .where(sql`EXTRACT(MONTH FROM ${clients.created_at}) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM ${clients.created_at}) = EXTRACT(YEAR FROM CURRENT_DATE)`);

        // Estimated monthly revenue (sum of prices for active subscriptions)
        const revenueResult = await db
            .select({ total: sql<number>`COALESCE(SUM(${services.prezzo}), 0)` })
            .from(subscriptions)
            .leftJoin(services, eq(subscriptions.service_id, services.id))
            .where(eq(subscriptions.status, "attivo"));

        // Top services by active subscriptions count
        const topServices = await db
            .select({
                name: services.nome_servizio,
                count: count(),
            })
            .from(subscriptions)
            .leftJoin(services, eq(subscriptions.service_id, services.id))
            .where(eq(subscriptions.status, "attivo"))
            .groupBy(services.nome_servizio)
            .orderBy(desc(count()))
            .limit(5);

        // Clients expiring soon (list with details)
        const expiringClients = await db
            .select({
                clientName: sql<string>`${clients.nome} || ' ' || ${clients.cognome}`,
                serviceName: services.nome_servizio,
                expiryDate: subscriptions.data_fine,
            })
            .from(subscriptions)
            .leftJoin(clients, eq(subscriptions.client_id, clients.id))
            .leftJoin(services, eq(subscriptions.service_id, services.id))
            .where(
                and(
                    eq(subscriptions.status, "attivo"),
                    sql`${subscriptions.data_fine} <= CURRENT_DATE + INTERVAL '14 days'`,
                    sql`${subscriptions.data_fine} >= CURRENT_DATE`
                )
            )
            .orderBy(subscriptions.data_fine)
            .limit(5);

        // Total clients
        const totalClientsCount = await db.select({ val: count() }).from(clients);

        // Monthly client growth (last 6 months)
        const monthlyGrowth = await db
            .select({
                month: sql<string>`TO_CHAR(${clients.created_at}, 'YYYY-MM')`,
                count: count(),
            })
            .from(clients)
            .where(sql`${clients.created_at} >= CURRENT_DATE - INTERVAL '6 months'`)
            .groupBy(sql`TO_CHAR(${clients.created_at}, 'YYYY-MM')`)
            .orderBy(sql`TO_CHAR(${clients.created_at}, 'YYYY-MM')`);

        // Churn: subscriptions that expired this month
        const expiredThisMonth = await db
            .select({ val: count() })
            .from(subscriptions)
            .where(
                and(
                    eq(subscriptions.status, "scaduto"),
                    sql`EXTRACT(MONTH FROM ${subscriptions.data_fine}::timestamp) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM ${subscriptions.data_fine}::timestamp) = EXTRACT(YEAR FROM CURRENT_DATE)`
                )
            );

        // Active subscriptions that started this month (new acquisitions)
        const newSubsThisMonth = await db
            .select({ val: count() })
            .from(subscriptions)
            .where(
                and(
                    eq(subscriptions.status, "attivo"),
                    sql`EXTRACT(MONTH FROM ${subscriptions.data_inizio}::timestamp) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM ${subscriptions.data_inizio}::timestamp) = EXTRACT(YEAR FROM CURRENT_DATE)`
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
            activeClients: activeClientsCount[0].val,
            expiringSoon: expiringSoonCount[0].val,
            newClients: newClientsThisMonth[0].val,
            totalClients: totalClientsCount[0].val,
            estimatedRevenue: revenueResult[0]?.total || 0,
            topServices: topServices.map(s => ({
                name: s.name || "Sconosciuto",
                count: s.count,
            })),
            expiringClients: expiringClients.map(c => ({
                clientName: c.clientName,
                serviceName: c.serviceName || "-",
                expiryDate: c.expiryDate,
            })),
            // New fields
            monthlyGrowth: growthData,
            churn: {
                expiredThisMonth: expiredThisMonth[0]?.val || 0,
                newSubsThisMonth: newSubsThisMonth[0]?.val || 0,
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

