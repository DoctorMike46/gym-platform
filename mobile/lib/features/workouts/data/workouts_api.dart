import 'package:dio/dio.dart';

import '../../../core/network/api_exception.dart';

class WorkoutsApi {
  WorkoutsApi(this._dio);
  final Dio _dio;

  /// Esposto per chiamate dirette dal repository (es. /media/signed).
  Dio get dio => _dio;

  Future<List<Map<String, dynamic>>> listAssignments() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/workouts/assignments',
      );
      _ensureOk(response);
      final data = response.data!['data'] as Map<String, dynamic>;
      return (data['assignments'] as List<dynamic>).cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Map<String, dynamic>> getAssignmentDetail(int assignmentId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/workouts/assignments/$assignmentId',
      );
      _ensureOk(response);
      return response.data!['data'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<List<Map<String, dynamic>>> getAssignmentHistory(int assignmentId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/workouts/assignments/$assignmentId/history',
      );
      _ensureOk(response);
      final data = response.data!['data'] as Map<String, dynamic>;
      return (data['logs'] as List<dynamic>).cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<int> startSession({
    required int assignmentId,
    required int giorno,
    required String date,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/workouts/sessions',
        data: {
          'assignment_id': assignmentId,
          'giorno': giorno,
          'date': date,
        },
      );
      _ensureOk(response);
      final data = response.data!['data'] as Map<String, dynamic>;
      return (data['workout_log_id'] as num).toInt();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Map<String, dynamic>> getSessionDetail(int logId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/workouts/sessions/$logId',
      );
      _ensureOk(response);
      return response.data!['data'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
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
  }) async {
    final body = <String, dynamic>{
      'ordine': ordine,
      'sets_completed': setsCompleted,
      'reps_actual': repsActual,
      'weight_actual': weightActual,
      'rpe_actual': rpeActual,
    };
    if (note != null) body['note'] = note;

    try {
      final response = await _dio.put<Map<String, dynamic>>(
        '/api/v1/workouts/sessions/$logId/exercises/$templateExerciseId',
        data: body,
      );
      _ensureOk(response);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Map<String, dynamic>> getLastExerciseLogsBulk(
      List<int> templateExerciseIds) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/workouts/exercises/last-logs',
        data: {'template_exercise_ids': templateExerciseIds},
      );
      _ensureOk(response);
      final data = response.data!['data'] as Map<String, dynamic>;
      final logs = data['logs'];
      return logs is Map<String, dynamic> ? logs : {};
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> finishSession({
    required int logId,
    required int totalDurationSeconds,
    String? note,
  }) async {
    final body = <String, dynamic>{'total_duration_seconds': totalDurationSeconds};
    if (note != null && note.isNotEmpty) body['note'] = note;
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/workouts/sessions/$logId/finish',
        data: body,
      );
      _ensureOk(response);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  // ──────────────────────── Allegati ────────────────────────

  /// Risolve (o crea) l'exercise_log_id per (workoutLog, templateExercise).
  /// Utile per il flusso "aggiungi allegato durante la sessione".
  Future<int> resolveExerciseLogId({
    required int workoutLogId,
    required int templateExerciseId,
    int? ordine,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/workouts/sessions/$workoutLogId/exercises/$templateExerciseId/resolve-log',
        data: {
          if (ordine != null) 'ordine': ordine,
        },
      );
      _ensureOk(response);
      final data = response.data!['data'] as Map<String, dynamic>;
      return (data['exercise_log_id'] as num).toInt();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Chiede al backend un presigned URL per l'upload su R2.
  Future<Map<String, dynamic>> presignAttachment({
    required int exerciseLogId,
    required String filename,
    required String contentType,
    int? sizeBytes,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/workouts/exercise-logs/$exerciseLogId/attachments/presign',
        data: {
          'filename': filename,
          'content_type': contentType,
          if (sizeBytes != null) 'size_bytes': sizeBytes,
        },
      );
      _ensureOk(response);
      return response.data!['data'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Conferma e persiste un allegato dopo l'upload su R2.
  Future<int> confirmAttachment({
    required int exerciseLogId,
    required String r2Key,
    required String mimeType,
    String? filename,
    int? sizeBytes,
    int? durationSeconds,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/workouts/exercise-logs/$exerciseLogId/attachments',
        data: {
          'r2_key': r2Key,
          'mime_type': mimeType,
          if (filename != null) 'filename': filename,
          if (sizeBytes != null) 'size_bytes': sizeBytes,
          if (durationSeconds != null) 'duration_seconds': durationSeconds,
        },
      );
      _ensureOk(response);
      final data = response.data!['data'] as Map<String, dynamic>;
      return (data['attachment_id'] as num).toInt();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<List<Map<String, dynamic>>> listAttachments(int exerciseLogId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/workouts/exercise-logs/$exerciseLogId/attachments',
      );
      _ensureOk(response);
      final data = response.data!['data'] as Map<String, dynamic>;
      return (data['attachments'] as List<dynamic>).cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> deleteAttachment(int attachmentId) async {
    try {
      final response = await _dio.delete<Map<String, dynamic>>(
        '/api/v1/workouts/attachments/$attachmentId',
      );
      _ensureOk(response);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  void _ensureOk(Response response) {
    final code = response.statusCode ?? 0;
    if (code < 200 || code >= 300) {
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    }
  }
}
