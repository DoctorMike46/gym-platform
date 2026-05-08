import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../theme/app_radius.dart';

/// Skeleton box animato (shimmer-lite via fade pulsante).
class Skeleton extends StatelessWidget {
  const Skeleton({
    super.key,
    this.height = 14,
    this.width = double.infinity,
    this.radius,
  });

  final double height;
  final double width;
  final double? radius;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(radius ?? AppRadius.sm),
      ),
    ).animate(onPlay: (c) => c.repeat(reverse: true)).fade(
          begin: 0.4,
          end: 0.85,
          duration: 900.ms,
        );
  }
}

class SkeletonCircle extends StatelessWidget {
  const SkeletonCircle({super.key, this.size = 40});
  final double size;
  @override
  Widget build(BuildContext context) {
    return Skeleton(height: size, width: size, radius: size / 2);
  }
}

/// Lista skeleton di card (stile lista schede).
class SkeletonList extends StatelessWidget {
  const SkeletonList({
    super.key,
    this.itemCount = 4,
    this.itemHeight = 100,
    this.padding = const EdgeInsets.fromLTRB(16, 16, 16, 24),
  });

  final int itemCount;
  final double itemHeight;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: padding,
      itemCount: itemCount,
      physics: const NeverScrollableScrollPhysics(),
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, _) => Skeleton(
        height: itemHeight,
        radius: AppRadius.lg,
      ),
    );
  }
}
