import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../core/theme/app_colors.dart';

class SplashPage extends StatelessWidget {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              theme.colorScheme.primary,
              Color.lerp(theme.colorScheme.primary, AppColors.brandAccent, 0.4) ??
                  theme.colorScheme.primary,
            ],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                height: 96,
                width: 96,
                decoration: BoxDecoration(
                  color: AppColors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(28),
                ),
                child: const Icon(
                  Icons.fitness_center_rounded,
                  color: AppColors.white,
                  size: 48,
                ),
              )
                  .animate(onPlay: (c) => c.repeat(reverse: true))
                  .scale(
                    begin: const Offset(0.95, 0.95),
                    end: const Offset(1.05, 1.05),
                    duration: 1200.ms,
                    curve: Curves.easeInOut,
                  ),
              const SizedBox(height: 24),
              const Text(
                'Gym Platform',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.white,
                  letterSpacing: -0.3,
                ),
              ).animate().fadeIn(duration: 500.ms),
            ],
          ),
        ),
      ),
    );
  }
}
