import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/widgets/gradient_card.dart';
import '../../../core/widgets/hero_section.dart';
import '../../../core/widgets/stat_tile.dart';
import '../../auth/presentation/auth_controller.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final auth = ref.watch(authControllerProvider);
    final firstName = auth.profile?.nome ?? 'Atleta';

    return Scaffold(
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            HeroSection(
              height: 230,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Ciao,',
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: AppColors.white.withValues(alpha: 0.85),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              firstName,
                              style: theme.textTheme.displayMedium?.copyWith(
                                color: AppColors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(
                          Icons.logout_rounded,
                          color: AppColors.white,
                        ),
                        tooltip: 'Esci',
                        onPressed: () =>
                            ref.read(authControllerProvider.notifier).logout(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Pronto per il tuo allenamento?',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: AppColors.white.withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms),
            Transform.translate(
              offset: const Offset(0, -28),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: const [
                    Expanded(
                      child: StatTile(
                        label: 'WORKOUT',
                        value: '0',
                        icon: Icons.fitness_center_rounded,
                        delta: 'questa settimana',
                      ),
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: StatTile(
                        label: 'STREAK',
                        value: '0',
                        icon: Icons.local_fire_department_rounded,
                        delta: 'giorni',
                      ),
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: StatTile(
                        label: 'PESO',
                        value: '—',
                        icon: Icons.monitor_weight_rounded,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 150.ms, duration: 400.ms),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Allenamento di oggi', style: theme.textTheme.headlineSmall),
                  const SizedBox(height: 12),
                  GradientCard(
                    onTap: () {},
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.white.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(AppRadius.pill),
                          ),
                          child: const Text(
                            'IN ARRIVO',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.white,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Le tue schede appariranno qui',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: AppColors.white,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Il modulo workout arriva nella prossima fase.',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.white.withValues(alpha: 0.85),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 250.ms, duration: 400.ms).slideY(
                        begin: 0.1,
                      ),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
