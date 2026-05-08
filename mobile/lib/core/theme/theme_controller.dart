import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/secure_storage.dart';

/// Controlla la preferenza tema (light/dark/system) con persistenza in SecureStorage.
class ThemeController extends StateNotifier<ThemeMode> {
  ThemeController(this._storage) : super(ThemeMode.system) {
    _load();
  }

  final SecureStorage _storage;

  Future<void> _load() async {
    final v = await _storage.getThemeMode();
    switch (v) {
      case 'light':
        state = ThemeMode.light;
        break;
      case 'dark':
        state = ThemeMode.dark;
        break;
      case 'system':
      default:
        state = ThemeMode.system;
    }
  }

  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    await _storage.writeThemeMode(mode.name);
  }
}

final themeControllerProvider =
    StateNotifierProvider<ThemeController, ThemeMode>((ref) {
  return ThemeController(ref.watch(secureStorageProvider));
});
