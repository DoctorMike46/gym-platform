import 'package:dio/dio.dart';

import '../../../core/network/api_exception.dart';

class WorkoutsApi {
  WorkoutsApi(this._dio);
  final Dio _dio;

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

  Future<void> finishSession({
    required int logId,
    required int totalDurationSeconds,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/workouts/sessions/$logId/finish',
        data: {'total_duration_seconds': totalDurationSeconds},
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
