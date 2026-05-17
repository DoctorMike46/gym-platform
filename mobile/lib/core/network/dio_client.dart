import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/forced_logout_signal.dart';
import '../config/env.dart';
import '../storage/secure_storage.dart';
import 'auth_interceptor.dart';
import 'cert_pinning.dart';

/// Provider del Dio principale con auth interceptor (bearer + refresh).
final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(secureStorageProvider);

  // Dio "nudo" per il solo refresh (no interceptor → no loop)
  final refreshClient = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      contentType: 'application/json',
      responseType: ResponseType.json,
    ),
  );
  installCertPinning(refreshClient);

  // validateStatus default (status < 400 → success) così:
  // - 401 lancia DioException → auth interceptor lo intercetta e fa il refresh
  // - 4xx generici (400/404/422/...) lanciano DioException → fromDio() li trasforma
  //   in ApiException con il body {error: {code, message}} dal backend
  final dio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      contentType: 'application/json',
      responseType: ResponseType.json,
    ),
  );
  installCertPinning(dio);

  dio.interceptors.add(
    AuthInterceptor(
      storage: storage,
      refreshClient: refreshClient,
      onForcedLogout: () async {
        await storage.clearSession();
        // Incrementa il signal: AuthController lo ascolta e transita a
        // `unauthenticated`. Niente import diretto → niente ciclo.
        ref.read(forcedLogoutSignalProvider.notifier).update((v) => v + 1);
      },
    ),
  );

  return dio;
});
