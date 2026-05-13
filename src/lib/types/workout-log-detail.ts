import type {
    workout_logs,
    workout_exercise_logs,
    workout_template_exercises,
} from "@/db/schema";

type WorkoutLog = typeof workout_logs.$inferSelect;
type WorkoutExerciseLog = typeof workout_exercise_logs.$inferSelect;
type WorkoutTemplateExercise = typeof workout_template_exercises.$inferSelect;

export interface WorkoutLogAttachment {
    id: number;
    exercise_log_id: number;
    r2_key: string;
    mime_type: string;
    kind: string;
    filename: string | null;
    size_bytes: number | null;
    duration_seconds: number | null;
    uploaded_at: Date;
}

export interface WorkoutLogDetail {
    log: WorkoutLog;
    template: { id: number; nome_template: string; split_settimanale: number | null } | null;
    client: { nome: string; cognome: string };
    exerciseLogs: Array<{
        exerciseLog: WorkoutExerciseLog;
        templateExercise: WorkoutTemplateExercise | null;
        exercise: { id: number; nome: string; gruppo_muscolare: string | null } | null;
        attachments: WorkoutLogAttachment[];
    }>;
}
