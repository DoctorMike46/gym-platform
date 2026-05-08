import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Header curvo con clip path — stile fitness app moderne.
class HeroSection extends StatelessWidget {
  const HeroSection({
    super.key,
    required this.child,
    this.height = 240,
    this.colors,
  });

  final Widget child;
  final double height;
  final List<Color>? colors;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradientColors = colors ??
        [
          theme.colorScheme.primary,
          Color.lerp(theme.colorScheme.primary, AppColors.brandAccent, 0.35) ??
              theme.colorScheme.primary,
        ];

    return ClipPath(
      clipper: _HeroClipper(),
      child: Container(
        height: height,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: gradientColors,
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            child: child,
          ),
        ),
      ),
    );
  }
}

class _HeroClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();
    path.lineTo(0, size.height - 32);
    path.quadraticBezierTo(
      size.width / 2,
      size.height,
      size.width,
      size.height - 32,
    );
    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}
