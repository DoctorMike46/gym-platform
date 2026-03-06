import { getExercises } from "@/lib/actions/exercises";
import { getWorkoutTemplateWithExercises } from "@/lib/actions/workouts";
import BuilderContent from "./builder-content";
import { requireAuth } from "@/lib/auth";

export default async function WorkoutBuilderPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    await requireAuth();
    const availableExercises = await getExercises();

    // In NextJS 15+, searchParams is a Promise
    const resolvedParams = await searchParams;
    const editId = resolvedParams.edit ? Number(resolvedParams.edit) : null;
    let initialTemplate = null;

    if (editId) {
        initialTemplate = await getWorkoutTemplateWithExercises(editId);
    }

    return (
        <BuilderContent
            availableExercises={availableExercises}
            initialTemplate={initialTemplate}
        />
    );
}
