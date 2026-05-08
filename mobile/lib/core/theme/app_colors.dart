import 'package:flutter/material.dart';

/// Design tokens — colors. Light + dark variants.
/// Brand colors possono essere override runtime dai trainer settings.
class AppColors {
  AppColors._();

  // ─── Brand (default fallback) ───
  static const Color brandPrimary = Color(0xFF003366);
  static const Color brandPrimaryDark = Color(0xFF1A4D80);
  static const Color brandAccent = Color(0xFFFF6B35);
  static const List<Color> brandGradient = [
    Color(0xFF003366),
    Color(0xFF0055AA),
  ];

  // ─── Neutrals ───
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);

  // ─── Light surfaces ───
  static const Color lightBg = Color(0xFFF7F8FA);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceAlt = Color(0xFFF1F3F6);
  static const Color lightBorder = Color(0xFFE3E6EB);
  static const Color lightTextPrimary = Color(0xFF0F1729);
  static const Color lightTextSecondary = Color(0xFF59647A);
  static const Color lightTextDisabled = Color(0xFF9AA3B2);

  // ─── Dark surfaces ───
  static const Color darkBg = Color(0xFF0A0E1A);
  static const Color darkSurface = Color(0xFF131826);
  static const Color darkSurfaceAlt = Color(0xFF1C2235);
  static const Color darkBorder = Color(0xFF2A3147);
  static const Color darkTextPrimary = Color(0xFFF5F7FA);
  static const Color darkTextSecondary = Color(0xFFA0AAC0);
  static const Color darkTextDisabled = Color(0xFF5E6783);

  // ─── Semantic ───
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);
}
