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
import '../../../core/widgets/top_bar_actions.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../questionnaires/data/questionnaires_repository.dart';
import '../../subscriptions/data/subscriptions_repository.dart';
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
    final subs = ref.watch(subscriptionsListProvider);
    final pendingQuestionnaires = ref.watch(pendingQuestionnairesProvider);

    Subscription? expiringSoon;
    int? daysToExpiry;
    subs.whenData((list) {
      for (final s in list) {
        if (!s.isActive) continue;
        final end = s.dataFine;
        if (end == null) continue;
        final diff = end.difference(DateTime.now()).inDays;
        if (diff < 0 || diff > 14) continue;
        if (expiringSoon == null || diff < (daysToExpiry ?? 9999)) {
          expiringSoon = s;
          daysToExpiry = diff;
        }
      }
    });

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(clientStatsProvider);
          ref.invalidate(assignmentsListProvider);
          ref.invalidate(subscriptionsListProvider);
          ref.invalidate(pendingQuestionnairesProvider);
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
                        const TopBarActions(color: AppColors.white),
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
              stats.maybeWhen(
                data: (s) {
                  if (s.weeklySplitTarget == null && s.workoutsThisWeek == 0) {
                    return const SizedBox.shrink();
                  }
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    child: _WeeklyPlanCard(stats: s)
                        .animate()
                        .fadeIn(delay: 180.ms, duration: 400.ms)
                        .slideY(begin: 0.05),
                  );
                },
                orElse: () => const SizedBox.shrink(),
              ),
              pendingQuestionnaires.maybeWhen(
                data: (items) {
                  if (items.isEmpty) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    child: _PendingQuestionnairesBanner(items: items)
                        .animate()
                        .fadeIn(delay: 180.ms, duration: 400.ms),
                  );
                },
                orElse: () => const SizedBox.shrink(),
              ),
              if (expiringSoon != null && daysToExpiry != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                  child: _SubscriptionExpiringBanner(
                    days: daysToExpiry!,
                    serviceName: expiringSoon!.service?.nomeServizio,
                  ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
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
            label: 'PIANO',
            value: loading ? '…' : _planValue(s),
            icon: Icons.event_available_rounded,
            delta: _planDelta(s),
            deltaPositive: s != null && s.weeklySplitTarget != null
                ? s.workoutsThisWeek >= s.weeklySplitTarget!
                : null,
          ),
        ),
      ],
    );
  }

  static String _planValue(ClientStats? s) {
    if (s == null) return '—';
    final target = s.weeklySplitTarget;
    if (target == null || target <= 0) return '${s.workoutsThisWeek}';
    return '${s.workoutsThisWeek}/$target';
  }

  static String? _planDelta(ClientStats? s) {
    if (s == null) return null;
    final target = s.weeklySplitTarget;
    if (target == null || target <= 0) return 'questa settimana';
    final remaining = target - s.workoutsThisWeek;
    if (remaining <= 0) return 'piano completato!';
    if (remaining == 1) return 'manca 1 workout';
    return 'mancano $remaining workout';
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
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
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

class _WeeklyPlanCard extends StatelessWidget {
  const _WeeklyPlanCard({required this.stats});
  final ClientStats stats;

  String _two(int n) => n.toString().padLeft(2, '0');

  String _isoDate(DateTime d) =>
      '${d.year}-${_two(d.month)}-${_two(d.day)}';

  String _motivational(int done, int? target) {
    if (target == null || target <= 0) {
      if (done == 0) return 'Inizia oggi la tua settimana!';
      if (done == 1) return 'Ottimo, hai iniziato! Continua così.';
      return 'Continua così, stai andando alla grande!';
    }
    if (done >= target) return 'Piano completato! Ottimo lavoro 💪';
    final remaining = target - done;
    if (done == 0) return 'Piano: $target workout in settimana.';
    if (remaining == 1) return 'Manca 1 workout per chiudere la settimana!';
    return 'Mancano $remaining workout per completare il piano.';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final done = stats.workoutsThisWeek;
    final target = stats.weeklySplitTarget;

    // Lunedì della settimana corrente (Mon = 1)
    final now = DateTime.now();
    final monday = DateTime(now.year, now.month, now.day)
        .subtract(Duration(days: now.weekday - 1));
    final today = DateTime(now.year, now.month, now.day);

    final days = List<DateTime>.generate(
      7,
      (i) => monday.add(Duration(days: i)),
    );
    const labels = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

    final progress = (target == null || target <= 0)
        ? 0.0
        : (done / target).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.calendar_today_rounded,
                size: 18,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Piano settimanale',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                target != null && target > 0 ? '$done / $target' : '$done',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: theme.colorScheme.primary,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              if (target != null && done >= target) ...[
                const SizedBox(width: 6),
                Icon(
                  Icons.check_circle_rounded,
                  size: 18,
                  color: theme.colorScheme.primary,
                ),
              ],
            ],
          ),
          if (target != null && target > 0) ...[
            const SizedBox(height: 12),
            TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0.0, end: progress),
              duration: const Duration(milliseconds: 700),
              curve: Curves.easeOutCubic,
              builder: (context, v, _) => ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.pill),
                child: LinearProgressIndicator(
                  value: v,
                  minHeight: 8,
                  backgroundColor:
                      theme.colorScheme.primary.withValues(alpha: 0.10),
                  color: theme.colorScheme.primary,
                ),
              ),
            ),
          ],
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              for (var i = 0; i < 7; i++)
                _DayDot(
                  label: labels[i],
                  date: days[i],
                  done: stats.weeklyWorkoutDates.contains(_isoDate(days[i])),
                  isToday: days[i] == today,
                  isFuture: days[i].isAfter(today),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _motivational(done, target),
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _DayDot extends StatelessWidget {
  const _DayDot({
    required this.label,
    required this.date,
    required this.done,
    required this.isToday,
    required this.isFuture,
  });

  final String label;
  final DateTime date;
  final bool done;
  final bool isToday;
  final bool isFuture;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;
    final mutedColor = theme.textTheme.bodySmall?.color ?? Colors.grey;

    final Color bgColor;
    final Color borderColor;
    final Widget icon;

    if (done) {
      bgColor = primary;
      borderColor = primary;
      icon = const Icon(Icons.check_rounded, size: 14, color: AppColors.white);
    } else if (isToday) {
      bgColor = primary.withValues(alpha: 0.12);
      borderColor = primary;
      icon = Container(
        width: 6,
        height: 6,
        decoration: BoxDecoration(color: primary, shape: BoxShape.circle),
      );
    } else {
      bgColor = Colors.transparent;
      borderColor = mutedColor.withValues(alpha: isFuture ? 0.25 : 0.4);
      icon = const SizedBox.shrink();
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: isToday ? primary : mutedColor,
            letterSpacing: 0.4,
          ),
        ),
        const SizedBox(height: 4),
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: bgColor,
            shape: BoxShape.circle,
            border: Border.all(
              color: borderColor,
              width: isToday && !done ? 1.5 : 1,
            ),
          ),
          alignment: Alignment.center,
          child: icon,
        ),
      ],
    );
  }
}

class _SubscriptionExpiringBanner extends StatelessWidget {
  const _SubscriptionExpiringBanner({
    required this.days,
    required this.serviceName,
  });

  final int days;
  final String? serviceName;

  String _message() {
    final svc = serviceName != null && serviceName!.trim().isNotEmpty
        ? ' "$serviceName"'
        : '';
    if (days <= 0) return 'L\'abbonamento$svc scade oggi';
    if (days == 1) return 'L\'abbonamento$svc scade domani';
    return 'L\'abbonamento$svc scade tra $days giorni';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final urgent = days <= 7;
    final accent = urgent ? AppColors.danger : AppColors.brandAccent;
    return Material(
      color: accent.withValues(alpha: 0.10),
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: () => context.push('/subscriptions'),
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: accent.withValues(alpha: 0.35)),
          ),
          child: Row(
            children: [
              Icon(
                urgent
                    ? Icons.warning_amber_rounded
                    : Icons.event_repeat_rounded,
                color: accent,
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _message(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Tocca per vedere i pacchetti',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: theme.textTheme.bodySmall?.color,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PendingQuestionnairesBanner extends StatelessWidget {
  const _PendingQuestionnairesBanner({required this.items});
  final List<QuestionnairePendingItem> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = theme.colorScheme.primary;
    final isSingle = items.length == 1;
    final destination = isSingle
        ? '/questionnaires/${items.first.assignmentId}'
        : '/questionnaires';

    final title = isSingle
        ? items.first.nome
        : 'Hai ${items.length} questionari da compilare';
    final subtitle = isSingle
        ? (items.first.motivo?.trim().isNotEmpty == true
            ? items.first.motivo!
            : 'Tocca per compilarlo')
        : 'Tocca per vederli tutti';

    return Material(
      color: accent.withValues(alpha: 0.10),
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: () => context.push(destination),
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: accent.withValues(alpha: 0.35)),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: accent,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.checklist_rtl_rounded,
                  size: 20,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              if (!isSingle)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: accent,
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                  ),
                  child: Text(
                    '${items.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
              Icon(
                Icons.chevron_right_rounded,
                color: theme.textTheme.bodySmall?.color,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
