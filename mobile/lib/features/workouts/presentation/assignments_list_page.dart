import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/widgets/gradient_card.dart';
import '../../../shared/utils/date_format_it.dart';
import '../data/workouts_repository.dart';
import '../domain/workout_models.dart';

class AssignmentsListPage extends ConsumerWidget {
  const AssignmentsListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final asyncList = ref.watch(assignmentsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Schede'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(assignmentsListProvider),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(assignmentsListProvider),
        child: asyncList.when(
          loading: () => const _LoadingList(),
          error: (e, _) => _ErrorState(
            message: e is ApiException ? e.message : 'Errore di caricamento',
            onRetry: () => ref.invalidate(assignmentsListProvider),
          ),
          data: (items) {
            if (items.isEmpty) {
              return const _EmptyState();
            }
            final active = items.where((i) => i.assignment.attivo).toList();
            final past = items.where((i) => !i.assignment.attivo).toList();

            return ListView(
              physics: const AlwaysScrollableScrollPhysics(
                parent: BouncingScrollPhysics(),
              ),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                if (active.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(4, 8, 4, 12),
                    child: Text(
                      'In corso',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.textTheme.bodySmall?.color,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ),
                  for (var i = 0; i < active.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _AssignmentCard(
                        item: active[i],
                        primary: true,
                      ).animate().fadeIn(
                            delay: Duration(milliseconds: 50 * i),
                            duration: 300.ms,
                          ),
                    ),
                ],
                if (past.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(4, 16, 4, 12),
                    child: Text(
                      'Archivio',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.textTheme.bodySmall?.color,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ),
                  for (final item in past)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _AssignmentCard(item: item, primary: false),
                    ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _AssignmentCard extends StatelessWidget {
  const _AssignmentCard({required this.item, required this.primary});
  final WorkoutAssignmentWithTemplate item;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final name = item.template?.nomeTemplate ?? 'Scheda non disponibile';
    final split = item.template?.splitSettimanale;
    final dateStr = formatDateItShort(item.assignment.dataAssegnazione);

    if (primary) {
      return Hero(
        tag: 'assignment-${item.assignment.id}',
        flightShuttleBuilder: (_, anim, _, _, _) {
          // durante il flight, niente shadow (eviti sfarfallio)
          return Material(
            color: Colors.transparent,
            child: GradientCard(
              onTap: null,
              child: _CardContent(
                name: name,
                split: split,
                dateStr: dateStr,
                textColor: AppColors.white,
                subColor: AppColors.white.withValues(alpha: 0.85),
                badge: 'ATTIVA',
                badgeColor: AppColors.white.withValues(alpha: 0.18),
                chevronColor: AppColors.white,
              ),
            ),
          );
        },
        child: GradientCard(
          onTap: () => context.push('/workouts/${item.assignment.id}'),
          child: _CardContent(
            name: name,
            split: split,
            dateStr: dateStr,
            textColor: AppColors.white,
            subColor: AppColors.white.withValues(alpha: 0.85),
            badge: 'ATTIVA',
            badgeColor: AppColors.white.withValues(alpha: 0.18),
            chevronColor: AppColors.white,
          ),
        ),
      );
    }

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: () => context.push('/workouts/${item.assignment.id}'),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            border: Border.all(color: theme.colorScheme.outline),
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          child: _CardContent(
            name: name,
            split: split,
            dateStr: dateStr,
            textColor: theme.colorScheme.onSurface,
            subColor: theme.textTheme.bodySmall?.color,
            badge: 'ARCHIVIO',
            badgeColor: theme.colorScheme.surfaceContainerHighest,
            chevronColor: theme.textTheme.bodySmall?.color,
          ),
        ),
      ),
    );
  }
}

class _CardContent extends StatelessWidget {
  const _CardContent({
    required this.name,
    required this.split,
    required this.dateStr,
    required this.textColor,
    required this.subColor,
    required this.badge,
    required this.badgeColor,
    required this.chevronColor,
  });

  final String name;
  final int? split;
  final String dateStr;
  final Color textColor;
  final Color? subColor;
  final String badge;
  final Color badgeColor;
  final Color? chevronColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: badgeColor,
            borderRadius: BorderRadius.circular(AppRadius.pill),
          ),
          child: Text(
            badge,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: textColor,
              letterSpacing: 0.6,
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          name,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: textColor,
            letterSpacing: -0.3,
            height: 1.2,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Icon(Icons.calendar_today_rounded, size: 14, color: subColor),
            const SizedBox(width: 6),
            Text(
              'Assegnata $dateStr',
              style: TextStyle(fontSize: 13, color: subColor, fontWeight: FontWeight.w500),
            ),
            if (split != null) ...[
              const SizedBox(width: 16),
              Icon(Icons.fitness_center_rounded, size: 14, color: subColor),
              const SizedBox(width: 6),
              Text(
                '$split ${split == 1 ? "giorno" : "giorni"}/sett',
                style: TextStyle(fontSize: 13, color: subColor, fontWeight: FontWeight.w500),
              ),
            ],
            const Spacer(),
            Icon(Icons.chevron_right_rounded, color: chevronColor),
          ],
        ),
      ],
    );
  }
}

class _LoadingList extends StatelessWidget {
  const _LoadingList();
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 3,
      itemBuilder: (_, i) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Container(
          height: 132,
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
        ).animate(onPlay: (c) => c.repeat(reverse: true)).fade(
              begin: 0.4,
              end: 0.7,
              duration: 900.ms,
            ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        shrinkWrap: true,
        padding: const EdgeInsets.all(32),
        children: [
          const SizedBox(height: 80),
          Icon(
            Icons.fitness_center_rounded,
            size: 64,
            color: theme.colorScheme.primary.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          Text(
            'Nessuna scheda assegnata',
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Il tuo trainer non ti ha ancora assegnato schede.\nTorna a controllare più tardi.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cloud_off_rounded, size: 56, color: AppColors.danger),
            const SizedBox(height: 16),
            Text('Caricamento fallito', style: theme.textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium),
            const SizedBox(height: 16),
            FilledButton.tonalIcon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Riprova'),
            ),
          ],
        ),
      ),
    );
  }
}
