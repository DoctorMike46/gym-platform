import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/widgets/branding_logo.dart';
import '../../../core/widgets/gradient_card.dart';
import '../../../core/widgets/hero_section.dart';
import '../../../core/widgets/stat_tile.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../workouts/data/workouts_repository.dart';
import '../../workouts/domain/workout_models.dart';
import '../data/stats_repository.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final auth = ref.watch(authControllerProvider);
    final firstName = auth.profile?.nome ?? 'Atleta';
    final branding = auth.branding;
    final stats = ref.watch(clientStatsProvider);
    final assignments = ref.watch(assignmentsListProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(clientStatsProvider);
          ref.invalidate(assignmentsListProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              HeroSection(
                height: 240,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        BrandingLogo(url: branding?.logoUrl, size: 44),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            branding?.siteName ?? 'Gym Platform',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleMedium?.copyWith(
                              color: AppColors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
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
              ).animate().fadeIn(duration: 400.ms),
              Transform.translate(
                offset: const Offset(0, -28),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: stats.when(
                    loading: () => _StatsRow.loading(),
                    error: (_, _) => _StatsRow.empty(),
                    data: (s) => _StatsRow(stats: s),
                  ),
                ).animate().fadeIn(delay: 150.ms, duration: 400.ms),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Allenamento di oggi',
                        style: theme.textTheme.headlineSmall),
                    const SizedBox(height: 12),
                    _NextWorkoutCard(stats: stats, assignments: assignments)
                        .animate()
                        .fadeIn(delay: 250.ms, duration: 400.ms)
                        .slideY(begin: 0.1),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ───────────────────────────── Stats row ─────────────────────────────

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.stats}) : _loading = false;
  const _StatsRow.loading()
      : stats = null,
        _loading = true;
  const _StatsRow.empty()
      : stats = null,
        _loading = false;

  final ClientStats? stats;
  final bool _loading;

  @override
  Widget build(BuildContext context) {
    final s = stats;
    final loading = _loading;
    return Row(
      children: [
        Expanded(
          child: StatTile(
            label: 'WORKOUT',
            value: loading ? '…' : (s?.workoutsThisWeek.toString() ?? '0'),
            icon: Icons.fitness_center_rounded,
            delta: 'ultimi 7 gg',
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: StatTile(
            label: 'STREAK',
            value: loading ? '…' : (s?.streakDays.toString() ?? '0'),
            icon: Icons.local_fire_department_rounded,
            delta: s != null && s.streakDays == 1 ? 'giorno' : 'giorni',
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: StatTile(
            label: 'PESO',
            value: loading
                ? '…'
                : (s?.lastWeightKg != null
                    ? s!.lastWeightKg!.toStringAsFixed(1)
                    : '—'),
            icon: Icons.monitor_weight_rounded,
            delta: _weightDelta(s),
            deltaPositive: s?.weightChange30d != null
                ? (s!.weightChange30d! < 0)
                : null,
          ),
        ),
      ],
    );
  }

  static String? _weightDelta(ClientStats? s) {
    final d = s?.weightChange30d;
    if (d == null) return null;
    if (d == 0) return 'invariato';
    final sign = d > 0 ? '+' : '';
    return '$sign${d.toStringAsFixed(1)} kg · 30gg';
  }
}

// ───────────────────────────── Next workout card ─────────────────────────────

class _NextWorkoutCard extends ConsumerWidget {
  const _NextWorkoutCard({required this.stats, required this.assignments});
  final AsyncValue<ClientStats> stats;
  final AsyncValue<List<WorkoutAssignmentWithTemplate>> assignments;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return stats.when(
      loading: () => _LoadingCard(),
      error: (e, _) => _ErrorCard(
        message: e is ApiException ? e.message : 'Errore caricamento',
        onRetry: () => ref.invalidate(clientStatsProvider),
      ),
      data: (s) {
        final next = s.nextSuggested;
        if (next == null || s.activeAssignments == 0) {
          return _EmptyCard();
        }
        return assignments.when(
          loading: () => _LoadingCard(),
          error: (_, _) => _EmptyCard(),
          data: (list) {
            final active = list
                .where((i) =>
                    i.assignment.attivo && i.assignment.id == next.assignmentId)
                .toList();
            final activeName =
                active.isNotEmpty ? active.first.template?.nomeTemplate : null;
            final split = active.isNotEmpty
                ? active.first.template?.splitSettimanale
                : null;
            // Ciclo del giorno se split: es. split=3, giorno suggerito=4 → 1
            int giorno = next.giorno;
            if (split != null && split > 0) {
              giorno = ((giorno - 1) % split) + 1;
            }
            final volume = s.volumeThisWeek;

            return GradientCard(
              onTap: () =>
                  context.push('/workouts/${next.assignmentId}'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.white.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(AppRadius.pill),
                        ),
                        child: const Text(
                          'PROSSIMO',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.white,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                      const Spacer(),
                      const Icon(
                        Icons.arrow_forward_rounded,
                        color: AppColors.white,
                        size: 18,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    activeName ?? 'La tua scheda',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.white,
                      letterSpacing: -0.3,
                      height: 1.15,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(
                        Icons.calendar_today_rounded,
                        size: 14,
                        color: AppColors.white.withValues(alpha: 0.85),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Giorno $giorno',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.white.withValues(alpha: 0.85),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (volume > 0) ...[
                        const SizedBox(width: 12),
                        Icon(
                          Icons.bar_chart_rounded,
                          size: 14,
                          color: AppColors.white.withValues(alpha: 0.85),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${(volume / 1000).toStringAsFixed(1)}k kg vol/sett',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.white.withValues(alpha: 0.85),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _EmptyCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            child: Icon(Icons.event_available_rounded,
                color: theme.colorScheme.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Nessuna scheda assegnata',
                  style: theme.textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  'Il trainer non ti ha ancora assegnato schede.',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 120,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
    ).animate(onPlay: (c) => c.repeat(reverse: true)).fade(
          begin: 0.4,
          end: 0.7,
          duration: 900.ms,
        );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Icon(Icons.cloud_off_rounded, color: AppColors.danger),
          const SizedBox(width: 10),
          Expanded(child: Text(message, style: theme.textTheme.bodySmall)),
          TextButton(onPressed: onRetry, child: const Text('Riprova')),
        ],
      ),
    );
  }
}
