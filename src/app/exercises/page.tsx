import { getExercises } from "@/lib/actions/exercises";
import ExercisesPageClient from "./exercises-content";

export default async function ExercisesPage() {
    const exercisesData = await getExercises();

    return (
        <ExercisesPageClient exercisesData={exercisesData} />
    );
}
