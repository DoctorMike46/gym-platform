"use server";

import { revalidatePath } from "next/cache";
import { requireClientAuth } from "@/lib/client-auth";
import {
    finishClientWorkoutSession,
    getClientWorkoutAssignmentDetail,
    getClientWorkoutLogDetail,
    listClientWorkoutLogHistory,
    listClientWorkouts,
    saveClientExerciseLog,
    startClientWorkoutSession,
    type SaveExerciseLogInput,
    type StartWorkoutSessionInput,
} from "@/lib/services/workouts.service";

export async function getClientWorkouts() {
    const session = await requireClientAuth();
    return listClientWorkouts(session);
}

export async function getClientWorkoutDetail(assignmentId: number) {
    const session = await requireClientAuth();
    return getClientWorkoutAssignmentDetail(session, assignmentId);
}

export async function startWorkoutSession(params: StartWorkoutSessionInput) {
    const session = await requireClientAuth();
    return startClientWorkoutSession(session, params);
}

export async function saveExerciseLog(params: SaveExerciseLogInput) {
    const session = await requireClientAuth();
    return saveClientExerciseLog(session, params);
}

export async function finishWorkoutSession(
    workoutLogId: number,
    totalDurationSeconds: number
) {
    const session = await requireClientAuth();
    const result = await finishClientWorkoutSession(session, workoutLogId, totalDurationSeconds);
    revalidatePath("/portal");
    revalidatePath("/portal/workouts");
    return result;
}

export async function getWorkoutLogHistory(assignmentId: number) {
    const session = await requireClientAuth();
    return listClientWorkoutLogHistory(session, assignmentId);
}

export async function getWorkoutLogWithExercises(logId: number) {
    const session = await requireClientAuth();
    return getClientWorkoutLogDetail(session, logId);
}
