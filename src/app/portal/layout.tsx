import { getAuthenticatedClientSafe } from "@/lib/client-auth";
import { db } from "@/db";
import { settings, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PortalShell } from "@/components/portal/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
    const session = await getAuthenticatedClientSafe();

    if (!session) {
        return <>{children}</>;
    }

    const [s, c] = await Promise.all([
        db.select().from(settings).where(eq(settings.trainer_id, session.trainer_id)).limit(1),
        db.select({ nome: clients.nome, cognome: clients.cognome }).from(clients).where(eq(clients.id, session.id)).limit(1),
    ]);

    const brand = {
        site_name: s[0]?.site_name || "Ernesto Performance",
        primary_color: s[0]?.primary_color || "#003366",
        sidebar_color: s[0]?.sidebar_color || "#003366",
        logo_url: s[0]?.logo_url || null,
    };

    const clientName = c[0] ? `${c[0].nome} ${c[0].cognome}`.trim() : session.email;

    return (
        <PortalShell brand={brand} clientName={clientName}>
            {children}
        </PortalShell>
    );
}
