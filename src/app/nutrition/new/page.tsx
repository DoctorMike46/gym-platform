import { listTrainerClientsForNutrition } from "@/lib/actions/nutrition";
import { NewPlanContent } from "./new-plan-content";

export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
    const clients = await listTrainerClientsForNutrition();
    return <NewPlanContent clients={clients} />;
}
