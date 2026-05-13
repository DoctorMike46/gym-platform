import { notFound } from "next/navigation";
import { getClientById } from "@/lib/actions/clients";
import { getServices } from "@/lib/actions/services";
import { getAllWorkoutTemplates } from "@/lib/actions/workout-assignments";
import { getActiveMealPlanForClientByTrainer } from "@/lib/actions/nutrition";
import ClientDetailContent from "./client-detail-content";
import { requireAuth } from "@/lib/auth";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await requireAuth();
    const { id } = await params;
    const clientId = parseInt(id);

    if (isNaN(clientId)) notFound();

    const [client, services, templates, mealPlan] = await Promise.all([
        getClientById(clientId),
        getServices(),
        getAllWorkoutTemplates(),
        getActiveMealPlanForClientByTrainer(clientId),
    ]);

    if (!client) notFound();

    return (
        <ClientDetailContent
            client={client}
            services={services}
            templates={templates}
            mealPlan={mealPlan}
        />
    );
}
