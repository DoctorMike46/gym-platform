import { getClients } from "@/lib/actions/clients";
import ClientPageContent from "./client-content";
import { getServices } from "@/lib/actions/services";
import { requireAuth } from "@/lib/auth";

export default async function ClientsPage() {
    await requireAuth();
    const clientsData = await getClients();
    const servicesData = await getServices();

    return (
        <ClientPageContent clientsData={clientsData} servicesData={servicesData} />
    );
}
