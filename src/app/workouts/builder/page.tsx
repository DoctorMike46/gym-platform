import { getExercises } from "@/lib/actions/exercises";
import BuilderContent from "./builder-content";

export default async function WorkoutBuilderPage() {
    const availableExercises = await getExercises();

    return (
        <BuilderContent availableExercises={availableExercises} />
    );
}
