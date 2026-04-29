import { notFound } from "next/navigation";
import { requireClientAuth } from "@/lib/client-auth";
import { getClientWorkoutDetail, startWorkoutSession, getWorkoutLogWithExercises } from "@/lib/actions/portal-workouts";
import LogSession from "./log-session";

export const dynamic = "force-dynamic";

export default async function WorkoutLogPage({
    params,
    searchParams,
}: {
    params: Promise<{ assignmentId: string; date: string }>;
    searchParams: Promise<{ giorno?: string }>;
}) {
    await requireClientAuth();
    const { assignmentId, date } = await params;
    const { giorno } = await searchParams;
    const id = parseInt(assignmentId);
    const day = parseInt(giorno || "1") || 1;
    if (isNaN(id)) notFound();

    const detail = await getClientWorkoutDetail(id).catch(() => null);
    if (!detail) notFound();

    const session = await startWorkoutSession({ assignmentId: id, giorno: day, date });
    const { exerciseLogs } = await getWorkoutLogWithExercises(session.id);

    const dayExercises = detail.exercises.filter((e) => (e.te.giorno || 1) === day);

    const initialLogs: Record<number, {
        sets_completed: number;
        reps_actual: number[];
        weight_actual: number[];
        rpe_actual: (number | null)[];
        note: string;
    }> = {};
    for (const row of exerciseLogs) {
        const log = row.exerciseLog;
        if (log.template_exercise_id) {
            initialLogs[log.template_exercise_id] = {
                sets_completed: log.sets_completed,
                reps_actual: (log.reps_actual as number[]) || [],
                weight_actual: (log.weight_actual as number[]) || [],
                rpe_actual: (log.rpe_actual as (number | null)[]) || [],
                note: log.note || "",
            };
        }
    }

    return (
        <LogSession
            workoutLogId={session.id}
            assignmentId={id}
            day={day}
            date={date}
            templateName={detail.template.nome_template}
            exercises={dayExercises.map((e) => ({
                templateExerciseId: e.te.id,
                ordine: e.te.ordine,
                name: e.ex?.nome || "Esercizio",
                gruppoMuscolare: e.ex?.gruppo_muscolare || "",
                serie: e.te.serie || "",
                ripetizioni: e.te.ripetizioni || "",
                recupero: e.te.recupero || "",
                rpe: e.te.rpe || "",
                note: e.te.note_tecniche || "",
                videoUrl: e.ex?.video_url || "",
            }))}
            initialLogs={initialLogs}
        />
    );
}
