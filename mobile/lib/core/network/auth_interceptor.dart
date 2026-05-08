import 'dart:async';

import 'package:dio/dio.dart';

import '../storage/secure_storage.dart';

/// Interceptor che:
/// - aggiunge il Bearer access token su ogni richiesta autenticata
/// - intercetta 401 e tenta un refresh con rotation
/// - se il refresh fallisce, pulisce i token e segnala "logout forzato"
typedef OnUnauthorized = Future<void> Function();

class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({
    required this.storage,
    required this.refreshClient,
    required this.onForcedLogout,
    this.publicPaths = const {
      '/api/v1/auth/login',
      '/api/v1/auth/refresh',
      '/api/v1/auth/forgot-password',
      '/api/v1/auth/reset-password',
      '/api/v1/onboarding/validate',
      '/api/v1/onboarding/complete',
    },
  });

  final SecureStorage storage;

  /// Dio "nudo" usato per il solo refresh, senza interceptor (evita loop).
  final Dio refreshClient;

  /// Callback chiamato quando il refresh fallisce: l'app deve forzare il logout.
  final OnUnauthorized onForcedLogout;

  final Set<String> publicPaths;

  bool _isPublic(String path) {
    return publicPaths.any((p) => path == p || path.endsWith(p));
  }

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (!_isPublic(options.path)) {
      final token = await storage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final response = err.response;
    if (response?.statusCode != 401 || _isPublic(err.requestOptions.path)) {
      return handler.next(err);
    }

    final refreshToken = await storage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      await onForcedLogout();
      return handler.next(err);
    }

    try {
      final refreshResponse = await refreshClient.post<Map<String, dynamic>>(
        '/api/v1/auth/refresh',
        data: {'refresh_token': refreshToken},
      );
      final data = refreshResponse.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw StateError('Invalid refresh response');

      final newAccess = data['access_token'] as String;
      final newRefresh = data['refresh_token'] as String;
      await storage.writeAccessToken(newAccess);
      await storage.writeRefreshToken(newRefresh);

      // Riprova la richiesta originale con il nuovo token
      final retryRequest = err.requestOptions;
      retryRequest.headers['Authorization'] = 'Bearer $newAccess';
      final retryResponse = await refreshClient.fetch<dynamic>(retryRequest);
      return handler.resolve(retryResponse);
    } catch (_) {
      await onForcedLogout();
      return handler.next(err);
    }
  }
}
