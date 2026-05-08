import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/theme_controller.dart';
import '../features/auth/presentation/auth_controller.dart';
import 'router.dart';

class GymPlatformApp extends ConsumerWidget {
  const GymPlatformApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Forza la creazione del controller (che avvia bootstrap nel costruttore).
    ref.watch(authControllerProvider);
    final router = ref.watch(routerProvider);
    final branding = ref.watch(authControllerProvider).branding;
    final themeMode = ref.watch(themeControllerProvider);
    final brandColor = _parseHexColor(branding?.primaryColor) ?? AppColors.brandPrimary;

    return MaterialApp.router(
      title: branding?.siteName ?? 'Gym Platform',
      debugShowCheckedModeBanner: false,
      themeMode: themeMode,
      theme: AppTheme.light(primaryOverride: brandColor),
      darkTheme: AppTheme.dark(primaryOverride: brandColor),
      routerConfig: router,
    );
  }

  Color? _parseHexColor(String? hex) {
    if (hex == null) return null;
    var s = hex.replaceAll('#', '').trim();
    if (s.length == 6) s = 'FF$s';
    final v = int.tryParse(s, radix: 16);
    return v == null ? null : Color(v);
  }
}
