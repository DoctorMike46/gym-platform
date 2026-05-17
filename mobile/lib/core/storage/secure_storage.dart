import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  SecureStorage(this._storage);

  static const _kAccessToken = 'access_token';
  static const _kRefreshToken = 'refresh_token';
  static const _kClientId = 'client_id';
  static const _kThemeMode = 'theme_mode';
  static const _kOnboardingDone = 'onboarding_done';
  static const _kBiometricEnabled = 'biometric_enabled';

  final FlutterSecureStorage _storage;

  Future<String?> getAccessToken() => _storage.read(key: _kAccessToken);
  Future<String?> getRefreshToken() => _storage.read(key: _kRefreshToken);
  Future<String?> getClientId() => _storage.read(key: _kClientId);
  Future<String?> getThemeMode() => _storage.read(key: _kThemeMode);

  Future<void> writeTokens({
    required String accessToken,
    required String refreshToken,
    required String clientId,
  }) async {
    await Future.wait([
      _storage.write(key: _kAccessToken, value: accessToken),
      _storage.write(key: _kRefreshToken, value: refreshToken),
      _storage.write(key: _kClientId, value: clientId),
    ]);
  }

  Future<void> writeAccessToken(String token) =>
      _storage.write(key: _kAccessToken, value: token);

  Future<void> writeRefreshToken(String token) =>
      _storage.write(key: _kRefreshToken, value: token);

  Future<void> writeThemeMode(String mode) =>
      _storage.write(key: _kThemeMode, value: mode);

  Future<bool> isOnboardingDone() async {
    final v = await _storage.read(key: _kOnboardingDone);
    return v == '1';
  }

  Future<void> markOnboardingDone() =>
      _storage.write(key: _kOnboardingDone, value: '1');

  /// H7 — opt-in biometric lock. Default OFF.
  Future<bool> isBiometricEnabled() async {
    final v = await _storage.read(key: _kBiometricEnabled);
    return v == '1';
  }

  Future<void> setBiometricEnabled(bool enabled) =>
      _storage.write(key: _kBiometricEnabled, value: enabled ? '1' : '0');

  Future<void> clearSession() async {
    await Future.wait([
      _storage.delete(key: _kAccessToken),
      _storage.delete(key: _kRefreshToken),
      _storage.delete(key: _kClientId),
    ]);
  }
}

final secureStorageProvider = Provider<SecureStorage>((ref) {
  const storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
  return SecureStorage(storage);
});
