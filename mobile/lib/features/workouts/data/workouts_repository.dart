import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
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
    String? note,
  }) {
    return _api.finishSession(
      logId: logId,
      totalDurationSeconds: totalDurationSeconds,
      note: note,
    );
  }

  /// Restituisce l'ultimo log per ogni template_exercise_id richiesto (null se assente).
  Future<Map<int, LastExerciseLog?>> getLastExerciseLogsBulk(
      List<int> templateExerciseIds) async {
    if (templateExerciseIds.isEmpty) return {};
    final raw = await _api.getLastExerciseLogsBulk(templateExerciseIds);
    final out = <int, LastExerciseLog?>{};
    raw.forEach((key, value) {
      final id = int.tryParse(key);
      if (id == null) return;
      if (value is Map<String, dynamic>) {
        out[id] = LastExerciseLog.fromJson(value);
      } else {
        out[id] = null;
      }
    });
    return out;
  }

  /// Risolve (o crea) l'exercise_log_id per (workoutLog, templateExercise).
  Future<int> resolveExerciseLogId({
    required int workoutLogId,
    required int templateExerciseId,
    int? ordine,
  }) {
    return _api.resolveExerciseLogId(
      workoutLogId: workoutLogId,
      templateExerciseId: templateExerciseId,
      ordine: ordine,
    );
  }

  /// Lista allegati per un exercise log.
  Future<List<WorkoutAttachment>> listAttachments(int exerciseLogId) async {
    final raw = await _api.listAttachments(exerciseLogId);
    return raw.map(WorkoutAttachment.fromJson).toList();
  }

  Future<void> deleteAttachment(int attachmentId) {
    return _api.deleteAttachment(attachmentId);
  }

  /// Upload completo di un allegato (foto/video):
  /// 1) presign URL
  /// 2) PUT diretto a R2 con i bytes
  /// 3) conferma server-side la nuova riga
  ///
  /// Ritorna l'id dell'attachment creato.
  Future<int> uploadAttachment({
    required int exerciseLogId,
    required String filename,
    required String contentType,
    required List<int> bytes,
    int? durationSeconds,
  }) async {
    final presign = await _api.presignAttachment(
      exerciseLogId: exerciseLogId,
      filename: filename,
      contentType: contentType,
      sizeBytes: bytes.length,
    );
    final uploadUrl = presign['upload_url'] as String;
    final r2Key = presign['r2_key'] as String;
    final headers = (presign['headers'] as Map<String, dynamic>).map(
      (k, v) => MapEntry(k, v.toString()),
    );

    final raw = Dio();
    try {
      await raw.put<void>(
        uploadUrl,
        data: Stream.fromIterable([bytes]),
        options: Options(
          headers: {
            ...headers,
            'Content-Length': bytes.length.toString(),
          },
        ),
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    } finally {
      raw.close();
    }

    return _api.confirmAttachment(
      exerciseLogId: exerciseLogId,
      r2Key: r2Key,
      mimeType: contentType,
      filename: filename,
      sizeBytes: bytes.length,
      durationSeconds: durationSeconds,
    );
  }

  /// Signed GET URL per visualizzare un allegato già caricato.
  /// Riusa il signed endpoint generico (workouts key sono whitelisted lì).
  Future<String?> getAttachmentSignedUrl(String r2Key) async {
    try {
      final dio = _api.dio;
      final r = await dio.get<Map<String, dynamic>>(
        '/api/v1/media/signed',
        queryParameters: {'key': r2Key},
      );
      return r.data?['data']?['url'] as String?;
    } on DioException {
      return null;
    }
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
