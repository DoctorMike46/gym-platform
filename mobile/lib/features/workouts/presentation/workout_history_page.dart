import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../shared/utils/date_format_it.dart';
import '../data/workouts_repository.dart';
import '../domain/workout_models.dart';
import 'widgets/exercise_attachments_section.dart';

class WorkoutHistoryPage extends ConsumerWidget {
  const WorkoutHistoryPage({super.key, required this.assignmentId});
  final int assignmentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncList = ref.watch(assignmentHistoryProvider(assignmentId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Storico allenamenti'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(assignmentHistoryProvider(assignmentId)),
        child: asyncList.when(
          loading: () => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: const [
              Skeleton(height: 100, radius: 16),
              SizedBox(height: 16),
              Skeleton(height: 84, radius: 16),
              SizedBox(height: 12),
              Skeleton(height: 84, radius: 16),
              SizedBox(height: 12),
              Skeleton(height: 84, radius: 16),
            ],
          ),
          error: (e, _) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              const SizedBox(height: 80),
              _ErrorBlock(
                message: e is ApiException ? e.message : 'Errore caricamento',
                onRetry: () => ref.invalidate(assignmentHistoryProvider(assignmentId)),
              ),
            ],
          ),
          data: (logs) {
            if (logs.isEmpty) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [_EmptyState()],
              );
            }
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(
                parent: BouncingScrollPhysics(),
              ),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                _StatsHeader(logs: logs),
                const SizedBox(height: 16),
                for (var i = 0; i < logs.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _LogCard(log: logs[i]).animate().fadeIn(
                          delay: Duration(milliseconds: 30 * i),
                          duration: 250.ms,
                        ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _StatsHeader extends StatelessWidget {
  const _StatsHeader({required this.logs});
  final List<WorkoutLog> logs;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final completed = logs.where((l) => l.isCompleted).toList();
    final totalCount = completed.length;

    final totalSec = completed
        .map((l) => l.totalDurationSeconds ?? 0)
        .fold<int>(0, (a, b) => a + b);
    final avgSec = totalCount > 0 ? totalSec ~/ totalCount : 0;

    return Container(
      padding: const EdgeInsets.all(20),
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
        borderRadius: BorderRadius.circular(AppRadius.xl),
      ),
      child: Row(
        children: [
          Expanded(
            child: _StatBlock(
              label: 'COMPLETATI',
              value: '$totalCount',
              icon: Icons.check_circle_rounded,
            ),
          ),
          Container(
            width: 1,
            height: 50,
            color: AppColors.white.withValues(alpha: 0.2),
          ),
          Expanded(
            child: _StatBlock(
              label: 'DURATA MEDIA',
              value: avgSec > 0
                  ? formatDuration(Duration(seconds: avgSec))
                  : '—',
              icon: Icons.timer_outlined,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatBlock extends StatelessWidget {
  const _StatBlock({required this.label, required this.value, required this.icon});
  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: AppColors.white.withValues(alpha: 0.85)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: AppColors.white.withValues(alpha: 0.85),
                letterSpacing: 0.6,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: AppColors.white,
            letterSpacing: -0.4,
            fontFeatures: [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}

class _LogCard extends ConsumerWidget {
  const _LogCard({required this.log});
  final WorkoutLog log;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isCompleted = log.isCompleted;
    final isInProgress = log.isInProgress;
    final color = isCompleted
        ? AppColors.success
        : isInProgress
            ? theme.colorScheme.primary
            : theme.textTheme.bodySmall?.color;

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: () => _showDetails(context, ref),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            border: Border.all(color: theme.colorScheme.outline),
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: (color ?? Colors.grey).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Icon(
                  isCompleted
                      ? Icons.check_circle_rounded
                      : isInProgress
                          ? Icons.play_circle_outline_rounded
                          : Icons.history_rounded,
                  color: color,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          formatDateItDow(log.dateExecuted),
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (log.giorno != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                            ),
                            child: Text(
                              'D${log.giorno}',
                              style: theme.textTheme.labelSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (log.totalDurationSeconds != null) ...[
                          Icon(Icons.timer_outlined,
                              size: 12,
                              color: theme.textTheme.bodySmall?.color),
                          const SizedBox(width: 4),
                          Text(
                            formatDuration(
                                Duration(seconds: log.totalDurationSeconds!)),
                            style: theme.textTheme.bodySmall,
                          ),
                          const SizedBox(width: 12),
                        ],
                        Text(
                          isCompleted
                              ? 'Completato'
                              : isInProgress
                                  ? 'In corso'
                                  : log.status,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: color,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    if (log.trainerNote != null && log.trainerNote!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.chat_bubble_outline_rounded,
                            size: 12,
                            color: AppColors.brandAccent,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Feedback trainer',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.brandAccent,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
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

  void _showDetails(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _LogDetailSheet(logId: log.id),
    );
  }
}

class _LogDetailSheet extends ConsumerWidget {
  const _LogDetailSheet({required this.logId});
  final int logId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final repo = ref.watch(workoutsRepositoryProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.95,
      minChildSize: 0.4,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: FutureBuilder<WorkoutLogDetail>(
            future: repo.getSessionDetail(logId),
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError || snapshot.data == null) {
                return Center(
                  child: Text(
                    snapshot.error is ApiException
                        ? (snapshot.error as ApiException).message
                        : 'Errore caricamento',
                    style: theme.textTheme.bodyMedium,
                  ),
                );
              }
              final detail = snapshot.data!;
              return ListView(
                controller: scrollController,
                padding: EdgeInsets.zero,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: theme.dividerColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    formatDateItLong(detail.log.dateExecuted),
                    style: theme.textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (detail.log.totalDurationSeconds != null)
                        _BadgeChip(
                          icon: Icons.timer_outlined,
                          text: formatDuration(
                            Duration(seconds: detail.log.totalDurationSeconds!),
                          ),
                        ),
                      const SizedBox(width: 8),
                      if (detail.log.giorno != null)
                        _BadgeChip(
                          icon: Icons.calendar_today_rounded,
                          text: 'Giorno ${detail.log.giorno}',
                        ),
                    ],
                  ),
                  if (detail.log.trainerNote != null &&
                      detail.log.trainerNote!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.brandAccent.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(
                          color: AppColors.brandAccent.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.chat_bubble_rounded,
                                size: 14,
                                color: AppColors.brandAccent,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'FEEDBACK TRAINER',
                                style: theme.textTheme.labelSmall?.copyWith(
                                  letterSpacing: 0.6,
                                  color: AppColors.brandAccent,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(detail.log.trainerNote!,
                              style: theme.textTheme.bodyMedium),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Text(
                    'ESERCIZI',
                    style: theme.textTheme.labelMedium?.copyWith(
                      letterSpacing: 0.6,
                      color: theme.textTheme.bodySmall?.color,
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (final row in detail.exerciseLogs)
                    _ExerciseLogRow(row: row),
                  const SizedBox(height: 24),
                ],
              );
            },
          ),
        );
      },
    );
  }
}

class _BadgeChip extends StatelessWidget {
  const _BadgeChip({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: theme.textTheme.bodySmall?.color),
          const SizedBox(width: 4),
          Text(text, style: theme.textTheme.labelSmall),
        ],
      ),
    );
  }
}

class _ExerciseLogRow extends StatelessWidget {
  const _ExerciseLogRow({required this.row});
  final SessionExerciseLogRow row;

  String _summary() {
    final reps = row.exerciseLog.repsActual.map((r) => r.toInt()).toList();
    final weights = row.exerciseLog.weightActual.map((w) => w.toDouble()).toList();
    if (reps.isEmpty) return '—';
    final allSame = weights.isNotEmpty && weights.toSet().length == 1 && weights.first > 0;
    if (allSame) {
      final w = weights.first;
      final wStr = w == w.truncateToDouble() ? w.toInt().toString() : w.toString();
      return '${reps.join("/")} reps @ ${wStr}kg';
    }
    final parts = <String>[];
    for (var i = 0; i < reps.length; i++) {
      final w = i < weights.length ? weights[i] : 0;
      final wStr = w == w.truncateToDouble() ? w.toInt().toString() : w.toStringAsFixed(1);
      parts.add('${reps[i]}×$wStr');
    }
    return parts.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            row.exercise?.nome ?? 'Esercizio',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _summary(),
            style: theme.textTheme.bodySmall?.copyWith(
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          if (row.exerciseLog.note != null && row.exerciseLog.note!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              row.exerciseLog.note!,
              style: theme.textTheme.bodySmall?.copyWith(
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
          const SizedBox(height: 10),
          ExerciseAttachmentsSection(
            exerciseLogId: row.exerciseLog.id,
            initial: row.attachments,
            compact: true,
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 80, 32, 32),
      child: Column(
        children: [
          Icon(
            Icons.history_rounded,
            size: 64,
            color: theme.colorScheme.primary.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          Text('Nessuna sessione', style: theme.textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(
            'Non hai ancora completato allenamenti per questa scheda.\nInizia il primo!',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

class _ErrorBlock extends StatelessWidget {
  const _ErrorBlock({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(Icons.cloud_off_rounded, size: 56, color: AppColors.danger),
          const SizedBox(height: 16),
          Text('Errore di caricamento', style: theme.textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(message,
              textAlign: TextAlign.center, style: theme.textTheme.bodyMedium),
          const SizedBox(height: 16),
          FilledButton.tonalIcon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Riprova'),
          ),
        ],
      ),
    );
  }
}
