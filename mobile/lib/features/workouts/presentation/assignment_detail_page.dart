import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../shared/utils/date_format_it.dart';
import '../data/workouts_repository.dart';
import '../domain/workout_models.dart';

class AssignmentDetailPage extends ConsumerWidget {
  const AssignmentDetailPage({super.key, required this.assignmentId});
  final int assignmentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncDetail = ref.watch(assignmentDetailProvider(assignmentId));

    return asyncDetail.when(
      loading: () => const _LoadingDetail(),
      error: (e, _) => _ErrorState(
        message: e is ApiException ? e.message : 'Errore di caricamento',
        onRetry: () => ref.invalidate(assignmentDetailProvider(assignmentId)),
      ),
      data: (detail) => _DetailContent(detail: detail),
    );
  }
}

class _DetailContent extends ConsumerStatefulWidget {
  const _DetailContent({required this.detail});
  final WorkoutAssignmentDetail detail;

  @override
  ConsumerState<_DetailContent> createState() => _DetailContentState();
}

class _DetailContentState extends ConsumerState<_DetailContent>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late final List<int> _days;
  late final Map<int, List<TemplateExerciseWithExercise>> _byDay;

  @override
  void initState() {
    super.initState();
    _byDay = widget.detail.exercisesByDay();
    _days = _byDay.keys.toList()..sort();
    _tabController = TabController(
      length: _days.isEmpty ? 1 : _days.length,
      vsync: this,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _onStartWorkout() async {
    final giorno = _days.isEmpty ? 1 : _days[_tabController.index];
    final repo = ref.read(workoutsRepositoryProvider);

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final logId = await repo.startSession(
        assignmentId: widget.detail.assignment.id,
        giorno: giorno,
        date: DateTime.now(),
      );
      if (!mounted) return;
      Navigator.of(context, rootNavigator: true).pop(); // chiudi loader
      context.push('/workouts/${widget.detail.assignment.id}/sessions/$logId');
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context, rootNavigator: true).pop();
      final msg = e is ApiException ? e.message : 'Errore avvio sessione';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final assignment = widget.detail.assignment;
    final template = widget.detail.template;
    final dateStr = formatDateItShort(assignment.dataAssegnazione);

    final hasNotes = template.noteProgressione != null &&
        template.noteProgressione!.trim().isNotEmpty;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.25),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: const Icon(
              Icons.arrow_back_rounded,
              color: AppColors.white,
              size: 20,
            ),
          ),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        actions: [
          IconButton(
            tooltip: 'Storico allenamenti',
            icon: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.25),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: const Icon(
                Icons.history_rounded,
                color: AppColors.white,
                size: 20,
              ),
            ),
            onPressed: () => context.push('/workouts/${assignment.id}/history'),
          ),
          const SizedBox(width: 8),
        ],
        iconTheme: const IconThemeData(color: AppColors.white),
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      bottomNavigationBar: assignment.attivo && _days.isNotEmpty
          ? AnimatedBuilder(
              animation: _tabController,
              builder: (context, _) => _StartCtaBar(
                onPressed: _onStartWorkout,
                giornoLabel: 'Giorno ${_days[_tabController.index]}',
              ),
            )
          : null,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Hero(
            tag: 'assignment-${assignment.id}',
            flightShuttleBuilder: (_, anim, _, _, _) {
              return Material(
                color: Colors.transparent,
                child: _HeroHeader(
                  templateName: template.nomeTemplate,
                  dateStr: dateStr,
                  splitSettimanale: template.splitSettimanale,
                ),
              );
            },
            child: _HeroHeader(
              templateName: template.nomeTemplate,
              dateStr: dateStr,
              splitSettimanale: template.splitSettimanale,
            ),
          ),
          if (hasNotes)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.tips_and_updates_rounded,
                      size: 20,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        template.noteProgressione!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (_days.isNotEmpty)
            Material(
              color: theme.scaffoldBackgroundColor,
              child: TabBar(
                controller: _tabController,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                labelColor: theme.colorScheme.primary,
                unselectedLabelColor: theme.textTheme.bodySmall?.color,
                indicatorColor: theme.colorScheme.primary,
                indicatorSize: TabBarIndicatorSize.label,
                labelStyle: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
                tabs: [for (final d in _days) Tab(text: 'Giorno $d')],
              ),
            ),
          Expanded(
            child: _days.isEmpty
                ? const Center(child: Text('Nessun esercizio in questa scheda'))
                : TabBarView(
                    controller: _tabController,
                    children: [
                      for (final d in _days) _DayExercisesList(exercises: _byDay[d]!),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _HeroHeader extends StatelessWidget {
  const _HeroHeader({
    required this.templateName,
    required this.dateStr,
    required this.splitSettimanale,
  });

  final String templateName;
  final String dateStr;
  final int? splitSettimanale;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
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
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 56, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: const Text(
                  'SCHEDA',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.white,
                    letterSpacing: 0.6,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                templateName,
                style: theme.textTheme.headlineMedium?.copyWith(
                  color: AppColors.white,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 16,
                runSpacing: 4,
                children: [
                  _HeaderChip(
                    icon: Icons.calendar_today_rounded,
                    text: 'Assegnata $dateStr',
                  ),
                  if (splitSettimanale != null)
                    _HeaderChip(
                      icon: Icons.fitness_center_rounded,
                      text: '$splitSettimanale ${splitSettimanale == 1 ? "giorno" : "giorni"}/sett',
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StartCtaBar extends StatelessWidget {
  const _StartCtaBar({required this.onPressed, required this.giornoLabel});
  final VoidCallback onPressed;
  final String giornoLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        12,
        16,
        12 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Allenamento del giorno selezionato: $giornoLabel',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 8),
          PrimaryButton(
            label: 'Inizia allenamento',
            icon: Icons.play_arrow_rounded,
            onPressed: onPressed,
          ),
        ],
      ),
    );
  }
}

class _HeaderChip extends StatelessWidget {
  const _HeaderChip({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.white.withValues(alpha: 0.85)),
        const SizedBox(width: 6),
        Text(
          text,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: AppColors.white.withValues(alpha: 0.85),
          ),
        ),
      ],
    );
  }
}


class _DayExercisesList extends StatelessWidget {
  const _DayExercisesList({required this.exercises});
  final List<TemplateExerciseWithExercise> exercises;

  @override
  Widget build(BuildContext context) {
    if (exercises.isEmpty) {
      return const Center(child: Text('Nessun esercizio'));
    }
    return ListView.separated(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
      itemCount: exercises.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, i) => _ExerciseCard(item: exercises[i])
          .animate()
          .fadeIn(delay: Duration(milliseconds: 30 * i), duration: 250.ms),
    );
  }
}

class _ExerciseCard extends StatefulWidget {
  const _ExerciseCard({required this.item});
  final TemplateExerciseWithExercise item;
  @override
  State<_ExerciseCard> createState() => _ExerciseCardState();
}

class _ExerciseCardState extends State<_ExerciseCard> {
  bool _expanded = false;

  Future<void> _openVideo(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossibile aprire il video')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final te = widget.item.templateExercise;
    final ex = widget.item.exercise;
    final hasNotes = te.noteTecniche != null && te.noteTecniche!.trim().isNotEmpty;
    final hasVideo = ex?.videoUrl != null && ex!.videoUrl!.isNotEmpty;
    final hasDescr = ex?.descrizione != null && ex!.descrizione!.trim().isNotEmpty;
    final canExpand = hasNotes || hasVideo || hasDescr;

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: canExpand ? () => setState(() => _expanded = !_expanded) : null,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            border: Border.all(color: theme.colorScheme.outline),
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '${te.ordine + 1}',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          ex?.nome ?? 'Esercizio',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (ex?.gruppoMuscolare != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            ex!.gruppoMuscolare!,
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (canExpand)
                    Icon(
                      _expanded
                          ? Icons.expand_less_rounded
                          : Icons.expand_more_rounded,
                      color: theme.textTheme.bodySmall?.color,
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  if (te.serie != null) _Stat(label: 'Serie', value: te.serie!),
                  if (te.ripetizioni != null)
                    _Stat(label: 'Reps', value: te.ripetizioni!),
                  if (te.recupero != null)
                    _Stat(label: 'Recupero', value: te.recupero!),
                  if (te.rpe != null) _Stat(label: 'RPE', value: te.rpe!),
                ],
              ),
              if (_expanded && canExpand) ...[
                const SizedBox(height: 14),
                const Divider(height: 1),
                const SizedBox(height: 12),
                if (hasNotes) ...[
                  Text(
                    'Note tecniche',
                    style: theme.textTheme.labelMedium?.copyWith(
                      letterSpacing: 0.4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(te.noteTecniche!, style: theme.textTheme.bodyMedium),
                  const SizedBox(height: 12),
                ],
                if (hasDescr) ...[
                  Text(
                    'Descrizione',
                    style: theme.textTheme.labelMedium?.copyWith(
                      letterSpacing: 0.4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(ex.descrizione!, style: theme.textTheme.bodyMedium),
                  const SizedBox(height: 12),
                ],
                if (hasVideo)
                  OutlinedButton.icon(
                    onPressed: () => _openVideo(ex.videoUrl!),
                    icon: const Icon(Icons.play_circle_outline_rounded),
                    label: const Text('Guarda video esecuzione'),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$label ',
            style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0.4),
          ),
          Text(
            value,
            style: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingDetail extends StatelessWidget {
  const _LoadingDetail();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: const Center(child: CircularProgressIndicator()),
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
    return Scaffold(
      appBar: AppBar(),
      body: Center(
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
      ),
    );
  }
}

