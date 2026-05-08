import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../domain/client_user.dart';
import 'auth_api.dart';

class AuthRepository {
  AuthRepository({required this.api, required this.storage});

  final AuthApi api;
  final SecureStorage storage;

  Future<ClientUser> login({required String email, required String password}) async {
    final data = await api.login(email: email, password: password);
    final accessToken = data['access_token'] as String;
    final refreshToken = data['refresh_token'] as String;
    final clientJson = data['client'] as Map<String, dynamic>;
    final user = ClientUser.fromJson(clientJson);

    await storage.writeTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
      clientId: user.id.toString(),
    );
    return user;
  }

  Future<void> logout() async {
    final refresh = await storage.getRefreshToken();
    if (refresh != null) {
      await api.logout(refreshToken: refresh);
    }
    await storage.clearSession();
  }

  Future<({ClientProfile profile, TrainerBranding? branding})> fetchMe() async {
    final data = await api.me();
    final profile = ClientProfile.fromJson(data['profile'] as Map<String, dynamic>);
    final brandingJson = data['trainer_branding'] as Map<String, dynamic>?;
    final branding =
        brandingJson != null ? TrainerBranding.fromJson(brandingJson) : null;
    return (profile: profile, branding: branding);
  }

  Future<bool> hasSession() async {
    final access = await storage.getAccessToken();
    final refresh = await storage.getRefreshToken();
    return access != null && access.isNotEmpty && refresh != null && refresh.isNotEmpty;
  }

  Future<void> requestPasswordReset(String email) =>
      api.requestPasswordReset(email);

  Future<void> updateProfile({String? telefono}) =>
      api.updateProfile(telefono: telefono);

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) {
    return api.changePassword(
      currentPassword: currentPassword,
      newPassword: newPassword,
    );
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    api: AuthApi(ref.watch(dioProvider)),
    storage: ref.watch(secureStorageProvider),
  );
});
