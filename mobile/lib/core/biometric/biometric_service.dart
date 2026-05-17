import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';

import '../storage/secure_storage.dart';

/// Servizio per l'autenticazione biometrica (H7).
///
/// Strategia:
///   - Opt-in: l'utente attiva la biometria dalle impostazioni
///   - Quando attivata + session valida, all'avvio app si richiede sblocco
///   - Fallback su passcode device se la biometria non è disponibile o fallisce
///   - In caso di errori "non recuperabili" (no hardware, no enrollment),
///     il setEnabled(false) torna a sessione normale senza prompt
class BiometricService {
  BiometricService(this._storage, this._auth);

  final SecureStorage _storage;
  final LocalAuthentication _auth;

  /// `true` se il device ha hardware biometrico **E** l'utente ha enrollato
  /// almeno un fattore (es. Face ID configurato).
  Future<bool> isDeviceCapable() async {
    try {
      final supported = await _auth.isDeviceSupported();
      if (!supported) return false;
      final canCheck = await _auth.canCheckBiometrics;
      return canCheck;
    } on PlatformException {
      return false;
    }
  }

  /// Flag opt-in persistito in flutter_secure_storage.
  Future<bool> isEnabled() => _storage.isBiometricEnabled();

  Future<void> setEnabled(bool enabled) => _storage.setBiometricEnabled(enabled);

  /// Mostra il prompt biometrico. Ritorna:
  ///   - `BiometricResult.success`: utente autenticato
  ///   - `BiometricResult.cancelled`: utente ha annullato/back-pressed
  ///   - `BiometricResult.failed`: matching fallito o errore non recuperabile
  Future<BiometricResult> authenticate({
    required String reason,
  }) async {
    try {
      final ok = await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: false, // permette fallback su passcode device
          stickyAuth: true, // mantiene auth dopo background brief
          sensitiveTransaction: true,
        ),
      );
      return ok ? BiometricResult.success : BiometricResult.cancelled;
    } on PlatformException catch (e) {
      // Codici tipici: NotAvailable, NotEnrolled, LockedOut, PermanentlyLockedOut
      // Per semplicità raggruppiamo come "failed".
      return _isUserCancel(e) ? BiometricResult.cancelled : BiometricResult.failed;
    }
  }

  bool _isUserCancel(PlatformException e) {
    return e.code == 'UserCancel' || e.code == 'UserFallback' || e.code == 'SystemCancel';
  }
}

enum BiometricResult { success, cancelled, failed }

final biometricServiceProvider = Provider<BiometricService>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return BiometricService(storage, LocalAuthentication());
});

/// Stato osservabile della "porta" biometrica.
///
///   - `initial`:  ancora non determinato (bootstrap async in corso)
///   - `disabled`: l'utente non ha attivato l'opt-in biometric → libero
///   - `locked`:   l'utente ha attivato l'opt-in → richiede sblocco
///   - `unlocked`: già sbloccata in questa sessione di app
///
/// Si resetta a `locked` ad ogni cold start / hot restart (il provider
/// viene ricreato). Per resettare al ritorno da background di X minuti,
/// integrare con `AppLifecycleState`.
enum BiometricGateState { initial, disabled, locked, unlocked }

class BiometricGateController extends StateNotifier<BiometricGateState> {
  BiometricGateController(this._service) : super(BiometricGateState.initial) {
    Future.microtask(bootstrap);
  }

  final BiometricService _service;

  Future<void> bootstrap() async {
    final enabled = await _service.isEnabled();
    final capable = enabled ? await _service.isDeviceCapable() : false;
    // Se l'utente l'ha attivato ma il device non è più capable (es. ha
    // disattivato Face ID dalle impostazioni iOS), trattiamo come disabled.
    state = (enabled && capable)
        ? BiometricGateState.locked
        : BiometricGateState.disabled;
  }

  void unlock() => state = BiometricGateState.unlocked;
  void lock() => state = BiometricGateState.locked;
  void disable() => state = BiometricGateState.disabled;

  /// Post-attivazione: l'utente ha appena fatto opt-in dalle impostazioni.
  /// In questa app-session lo consideriamo già `unlocked` (ha appena
  /// confermato la sua identità con biometric per attivare la feature).
  void enableAlreadyUnlocked() => state = BiometricGateState.unlocked;
}

final biometricGateControllerProvider =
    StateNotifierProvider<BiometricGateController, BiometricGateState>(
  (ref) {
    final service = ref.watch(biometricServiceProvider);
    return BiometricGateController(service);
  },
);
