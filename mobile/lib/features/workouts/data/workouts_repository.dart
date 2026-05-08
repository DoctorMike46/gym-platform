import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../domain/workout_models.dart';
import 'workouts_api.dart';

class WorkoutsRepository {
  WorkoutsRepository(this._api);
  final WorkoutsApi _api;

  Future<List<WorkoutAssignmentWithTemplate>> listAssignments() async {
    final raw = await _api.listAssignments();
    return raw.map(WorkoutAssignmentWithTemplate.fromJson).toList();
  }

  Future<WorkoutAssignmentDetail> getAssignmentDetail(int assignmentId) async {
    final raw = await _api.getAssignmentDetail(assignmentId);
    return WorkoutAssignmentDetail.fromJson(raw);
  }

  Future<List<WorkoutLog>> getAssignmentHistory(int assignmentId) async {
    final raw = await _api.getAssignmentHistory(assignmentId);
    return raw.map(WorkoutLog.fromJson).toList();
  }

  Future<WorkoutLogDetail> getSessionDetail(int logId) async {
    final raw = await _api.getSessionDetail(logId);
    return WorkoutLogDetail.fromJson(raw);
  }

  Future<int> startSession({
    required int assignmentId,
    required int giorno,
    required DateTime date,
  }) {
    final dateStr =
        '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    return _api.startSession(assignmentId: assignmentId, giorno: giorno, date: dateStr);
  }

  Future<void> saveExerciseLog({
    required int logId,
    required int templateExerciseId,
    required int ordine,
    required int setsCompleted,
    required List<num> repsActual,
    required List<num> weightActual,
    required List<num?> rpeActual,
    String? note,
  }) {
    return _api.saveExerciseLog(
      logId: logId,
      templateExerciseId: templateExerciseId,
      ordine: ordine,
      setsCompleted: setsCompleted,
      repsActual: repsActual,
      weightActual: weightActual,
      rpeActual: rpeActual,
      note: note,
    );
  }

  Future<void> finishSession({
    required int logId,
    required int totalDurationSeconds,
  }) {
    return _api.finishSession(logId: logId, totalDurationSeconds: totalDurationSeconds);
  }
}

final workoutsRepositoryProvider = Provider<WorkoutsRepository>((ref) {
  return WorkoutsRepository(WorkoutsApi(ref.watch(dioProvider)));
});

/// Lista schede del cliente. Auto-refetch su invalidate.
final assignmentsListProvider =
    FutureProvider<List<WorkoutAssignmentWithTemplate>>((ref) async {
  final repo = ref.watch(workoutsRepositoryProvider);
  return repo.listAssignments();
});

final assignmentDetailProvider =
    FutureProvider.family<WorkoutAssignmentDetail, int>((ref, id) async {
  final repo = ref.watch(workoutsRepositoryProvider);
  return repo.getAssignmentDetail(id);
});

final assignmentHistoryProvider =
    FutureProvider.family<List<WorkoutLog>, int>((ref, id) async {
  final repo = ref.watch(workoutsRepositoryProvider);
  return repo.getAssignmentHistory(id);
});
