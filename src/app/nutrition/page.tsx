import {
    listAllMealPlansForTrainer,
    listTrainerClientsForNutrition,
} from "@/lib/actions/nutrition";
import {
    countNutritionRequestsPending,
    listNutritionRequests,
} from "@/lib/actions/nutrition-requests";
import NutritionContent from "./nutrition-content";
import { requireAuth } from "@/lib/auth";

export default async function NutritionPage() {
    await requireAuth();
    const [plans, clients, pendingCount, requests] = await Promise.all([
        listAllMealPlansForTrainer(),
        listTrainerClientsForNutrition(),
        countNutritionRequestsPending(),
        listNutritionRequests({}),
    ]);
    return (
        <NutritionContent
            plans={plans}
            clients={clients}
            pendingRequestsCount={pendingCount}
            requests={requests}
        />
    );
}
