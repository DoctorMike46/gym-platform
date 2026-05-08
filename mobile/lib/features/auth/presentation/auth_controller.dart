import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/forced_logout_signal.dart';
import '../../../core/network/api_exception.dart';
import '../data/auth_repository.dart';
import '../domain/client_user.dart';

enum AuthStatus { initial, authenticated, unauthenticated }

class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.profile,
    this.branding,
    this.error,
  });

  final AuthStatus status;
  final ClientUser? user;
  final ClientProfile? profile;
  final TrainerBranding? branding;
  final String? error;

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isInitial => status == AuthStatus.initial;

  AuthState copyWith({
    AuthStatus? status,
    ClientUser? user,
    ClientProfile? profile,
    TrainerBranding? branding,
    String? error,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      profile: profile ?? this.profile,
      branding: branding ?? this.branding,
      error: error,
    );
  }

  static const initial = AuthState(status: AuthStatus.initial);
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository) : super(AuthState.initial) {
    // Avvia il bootstrap automaticamente alla creazione del controller.
    // Microtask per non bloccare il costruttore.
    Future.microtask(bootstrap);
  }

  final AuthRepository _repository;

  /// Bootstrap: verifica se esiste già una sessione e tenta /me.
  /// Timeout di sicurezza: se il check storage non risponde in 5s, vai al login.
  Future<void> bootstrap() async {
    debugPrint('[auth] bootstrap start');
    try {
      final hasSession = await _repository.hasSession().timeout(
            const Duration(seconds: 5),
            onTimeout: () {
              debugPrint('[auth] hasSession TIMEOUT — assuming no session');
              return false;
            },
          );
      debugPrint('[auth] hasSession=$hasSession');

      if (!hasSession) {
        state = const AuthState(status: AuthStatus.unauthenticated);
        return;
      }

      try {
        final me = await _repository.fetchMe().timeout(
              const Duration(seconds: 10),
            );
        state = AuthState(
          status: AuthStatus.authenticated,
          profile: me.profile,
          branding: me.branding,
        );
      } catch (e) {
        debugPrint('[auth] fetchMe failed: $e');
        try {
          await _repository.logout();
        } catch (_) {/* best effort */}
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    } catch (e, st) {
      debugPrint('[auth] bootstrap error: $e\n$st');
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> login({required String email, required String password}) async {
    state = state.copyWith(error: null);
    try {
      final user = await _repository.login(email: email, password: password);
      final me = await _repository.fetchMe();
      state = AuthState(
        status: AuthStatus.authenticated,
        user: user,
        profile: me.profile,
        branding: me.branding,
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: e.message,
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: 'Errore inatteso. Riprova.',
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  /// Forza un logout locale senza chiamare l'API (es. quando il refresh token
  /// è scaduto o invalidato dal backend). Lo storage è già stato pulito dal
  /// chiamante.
  void forceLogout() {
    state = const AuthState(
      status: AuthStatus.unauthenticated,
      error: 'Sessione scaduta, accedi di nuovo',
    );
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  final controller = AuthController(ref.watch(authRepositoryProvider));
  // Quando l'interceptor forza un logout (refresh fallito), reagisci.
  ref.listen<int>(forcedLogoutSignalProvider, (prev, next) {
    if (next > (prev ?? 0)) controller.forceLogout();
  });
  return controller;
});
