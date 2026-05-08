import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Typography scale based on Plus Jakarta Sans (Google Fonts).
class AppTypography {
  AppTypography._();

  static TextTheme textTheme(Color textColor, Color secondaryColor) {
    final base = GoogleFonts.plusJakartaSansTextTheme();
    return base.copyWith(
      displayLarge: base.displayLarge?.copyWith(
        fontSize: 40,
        fontWeight: FontWeight.w800,
        color: textColor,
        letterSpacing: -0.5,
        height: 1.1,
      ),
      displayMedium: base.displayMedium?.copyWith(
        fontSize: 32,
        fontWeight: FontWeight.w800,
        color: textColor,
        letterSpacing: -0.4,
        height: 1.15,
      ),
      headlineLarge: base.headlineLarge?.copyWith(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        color: textColor,
        letterSpacing: -0.3,
        height: 1.2,
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: textColor,
        letterSpacing: -0.2,
        height: 1.25,
      ),
      headlineSmall: base.headlineSmall?.copyWith(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: textColor,
        height: 1.3,
      ),
      titleLarge: base.titleLarge?.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: textColor,
        height: 1.35,
      ),
      titleMedium: base.titleMedium?.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: textColor,
        height: 1.4,
      ),
      bodyLarge: base.bodyLarge?.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        color: textColor,
        height: 1.5,
      ),
      bodyMedium: base.bodyMedium?.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: textColor,
        height: 1.5,
      ),
      bodySmall: base.bodySmall?.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: secondaryColor,
        height: 1.45,
      ),
      labelLarge: base.labelLarge?.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: textColor,
      ),
      labelMedium: base.labelMedium?.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: textColor,
        letterSpacing: 0.2,
      ),
      labelSmall: base.labelSmall?.copyWith(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: secondaryColor,
        letterSpacing: 0.4,
      ),
    );
  }

  /// Variante con tabular numerals (per pesi/reps).
  static TextStyle numeric(TextStyle base) {
    return base.copyWith(
      fontFeatures: const [FontFeature.tabularFigures()],
    );
  }
}
