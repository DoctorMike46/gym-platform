import { getWorkoutTemplates } from "@/lib/actions/workouts";
import WorkoutsContent from "./workouts-content";
import { requireAuth } from "@/lib/auth";

export default async function WorkoutsPage() {
    await requireAuth();
    const templates = await getWorkoutTemplates();
    return <WorkoutsContent templates={templates} />;
}
