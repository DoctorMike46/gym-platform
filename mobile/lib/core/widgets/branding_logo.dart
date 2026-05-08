import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Logo del trainer con fallback graceful (icona).
class BrandingLogo extends StatelessWidget {
  const BrandingLogo({
    super.key,
    required this.url,
    this.size = 44,
    this.background,
    this.fallbackIconColor,
    this.borderRadius,
  });

  final String? url;
  final double size;
  final Color? background;
  final Color? fallbackIconColor;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(size * 0.28);
    final bg = background ?? AppColors.white.withValues(alpha: 0.18);

    Widget fallback() => Icon(
          Icons.fitness_center_rounded,
          size: size * 0.5,
          color: fallbackIconColor ?? AppColors.white,
        );

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: radius,
      ),
      alignment: Alignment.center,
      clipBehavior: Clip.antiAlias,
      child: (url != null && url!.startsWith('http'))
          ? Image.network(
              url!,
              width: size,
              height: size,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => fallback(),
              loadingBuilder: (_, child, p) {
                if (p == null) return child;
                return SizedBox(
                  width: size * 0.4,
                  height: size * 0.4,
                  child: CircularProgressIndicator(
                    strokeWidth: 1.5,
                    color: fallbackIconColor ?? AppColors.white,
                  ),
                );
              },
            )
          : fallback(),
    );
  }
}
