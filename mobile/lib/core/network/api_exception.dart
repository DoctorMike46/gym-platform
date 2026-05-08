import 'package:dio/dio.dart';

class ApiException implements Exception {
  ApiException({
    required this.message,
    this.code,
    this.statusCode,
    this.cause,
  });

  final String message;
  final String? code;
  final int? statusCode;
  final Object? cause;

  bool get isUnauthorized => statusCode == 401;
  bool get isRateLimited => statusCode == 429;
  bool get isNetworkError => statusCode == null;

  @override
  String toString() => 'ApiException($statusCode $code: $message)';

  static ApiException fromDio(DioException e) {
    final response = e.response;
    if (response == null) {
      return ApiException(
        message: 'Errore di rete. Verifica la connessione.',
        cause: e,
      );
    }

    String? code;
    String message = 'Errore del server';
    final data = response.data;
    if (data is Map<String, dynamic>) {
      final err = data['error'];
      if (err is Map<String, dynamic>) {
        code = err['code']?.toString();
        message = err['message']?.toString() ?? message;
      } else if (data['message'] is String) {
        message = data['message'] as String;
      }
    }

    return ApiException(
      message: message,
      code: code,
      statusCode: response.statusCode,
      cause: e,
    );
  }
}
