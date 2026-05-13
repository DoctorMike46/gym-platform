import {
    listAllMealPlansForTrainer,
    listTrainerClientsForNutrition,
} from "@/lib/actions/nutrition";
import NutritionContent from "./nutrition-content";
import { requireAuth } from "@/lib/auth";

export default async function NutritionPage() {
    await requireAuth();
    const [plans, clients] = await Promise.all([
        listAllMealPlansForTrainer(),
        listTrainerClientsForNutrition(),
    ]);
    return <NutritionContent plans={plans} clients={clients} />;
}
