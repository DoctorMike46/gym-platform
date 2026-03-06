import { notFound } from "next/navigation";
import { getClientById } from "@/lib/actions/clients";
import { getServices } from "@/lib/actions/services";
import { getAllWorkoutTemplates } from "@/lib/actions/workout-assignments";
import ClientDetailContent from "./client-detail-content";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const clientId = parseInt(id);

    if (isNaN(clientId)) notFound();

    const [client, services, templates] = await Promise.all([
        getClientById(clientId),
        getServices(),
        getAllWorkoutTemplates(),
    ]);

    if (!client) notFound();

    return <ClientDetailContent client={client} services={services} templates={templates} />;
}
