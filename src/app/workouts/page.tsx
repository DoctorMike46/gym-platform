import { getWorkoutTemplates } from "@/lib/actions/workouts";
import WorkoutsContent from "./workouts-content";

export default async function WorkoutsPage() {
    const templates = await getWorkoutTemplates();
    return <WorkoutsContent templates={templates} />;
}
