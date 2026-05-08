import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';

/// Card con gradient background e ombra morbida.
/// Ispirata ai template di Best-Flutter-UI-Templates (hotel/fitness UI).
class GradientCard extends StatelessWidget {
  const GradientCard({
    super.key,
    required this.child,
    this.colors,
    this.padding = const EdgeInsets.all(20),
    this.radius = AppRadius.xl,
    this.onTap,
    this.height,
    this.width,
  });

  final Widget child;
  final List<Color>? colors;
  final EdgeInsetsGeometry padding;
  final double radius;
  final VoidCallback? onTap;
  final double? height;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final defaultColors = [
      theme.colorScheme.primary,
      Color.lerp(theme.colorScheme.primary, AppColors.brandAccent, 0.35) ??
          theme.colorScheme.primary,
    ];
    final gradientColors = colors ?? defaultColors;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        child: Ink(
          height: height,
          width: width,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: gradientColors,
            ),
            borderRadius: BorderRadius.circular(radius),
            boxShadow: [
              BoxShadow(
                color: gradientColors.last.withValues(alpha: 0.28),
                blurRadius: 24,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}
