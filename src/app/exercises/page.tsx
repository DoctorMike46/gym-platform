import { getExercises } from "@/lib/actions/exercises";
import ExercisesPageClient from "./exercises-content";
import { requireAuth } from "@/lib/auth";

export default async function ExercisesPage() {
    await requireAuth();
    const exercisesData = await getExercises();

    return (
        <ExercisesPageClient exercisesData={exercisesData} />
    );
}
