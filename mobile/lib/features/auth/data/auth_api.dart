import 'package:dio/dio.dart';

import '../../../core/network/api_exception.dart';

class AuthApi {
  AuthApi(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? deviceId,
  }) async {
    final body = <String, dynamic>{'email': email, 'password': password};
    if (deviceId != null) body['device_id'] = deviceId;
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/auth/login',
        data: body,
      );
      _ensureOk(response);
      return response.data!['data'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> logout({required String refreshToken}) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/v1/auth/logout',
        data: {'refresh_token': refreshToken},
      );
    } on DioException catch (_) {
      // Best-effort: ignoriamo errori
    }
  }

  Future<void> requestPasswordReset(String email) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/v1/auth/forgot-password',
        data: {'email': email},
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Map<String, dynamic>> me() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/api/v1/me');
      _ensureOk(response);
      return response.data!['data'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> updateProfile({String? telefono}) async {
    try {
      await _dio.patch<Map<String, dynamic>>(
        '/api/v1/me',
        data: {'telefono': telefono},
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/v1/me/password',
        data: {
          'current_password': currentPassword,
          'new_password': newPassword,
        },
      );
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
