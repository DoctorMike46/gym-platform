import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../shared/utils/date_format_it.dart';
import '../data/workouts_repository.dart';
import '../domain/workout_models.dart';
import 'session_controller.dart';
import 'widgets/exercise_attachments_section.dart';

class SessionPlayerPage extends ConsumerWidget {
  const SessionPlayerPage({
    super.key,
    required this.assignmentId,
    required this.logId,
  });

  final int assignmentId;
  final int logId;

  Future<bool> _confirmExit(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Lascia allenamento?'),
        content: const Text(
          'Le serie già registrate sono salvate. '
          'Puoi riprenderle entrando di nuovo nella scheda.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Resta'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Esci'),
          ),
        ],
      ),
    );
    return ok ?? false;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncSession = ref.watch(sessionControllerProvider(logId));

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final shouldExit = await _confirmExit(context);
        if (shouldExit && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: asyncSession.when(
        loading: () => const _LoadingState(),
        error: (e, _) => _ErrorState(
          message: e is ApiException ? e.message : 'Errore caricamento',
          onClose: () => Navigator.of(context).pop(),
        ),
        data: (state) => _SessionContent(
          state: state,
          logId: logId,
          assignmentId: assignmentId,
          onExitRequest: () async {
            final ok = await _confirmExit(context);
            if (ok && context.mounted) Navigator.of(context).pop();
          },
        ),
      ),
    );
  }
}

class _SessionContent extends ConsumerStatefulWidget {
  const _SessionContent({
    required this.state,
    required this.logId,
    required this.assignmentId,
    required this.onExitRequest,
  });

  final SessionState state;
  final int logId;
  final int assignmentId;
  final VoidCallback onExitRequest;

  @override
  ConsumerState<_SessionContent> createState() => _SessionContentState();
}

class _SessionContentState extends ConsumerState<_SessionContent> {
  final Map<int, GlobalKey> _cardKeys = {};
  final Set<int> _trackedComplete = {};
  int? _highlightedTplExId;
  Timer? _highlightTimer;

  SessionState get state => widget.state;
  int get logId => widget.logId;
  int get assignmentId => widget.assignmentId;

  @override
  void initState() {
    super.initState();
    // Seed con esercizi già completati al primo build (es. ripresa sessione)
    for (final ex in state.exercisesOfDay) {
      final id = ex.templateExercise.id;
      if (state.editStates[id]?.isComplete == true) {
        _trackedComplete.add(id);
      }
    }
  }

  @override
  void didUpdateWidget(covariant _SessionContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Rileva transizione false → true (esercizio appena completato)
    for (final ex in state.exercisesOfDay) {
      final id = ex.templateExercise.id;
      final nowComplete = state.editStates[id]?.isComplete == true;
      if (nowComplete && !_trackedComplete.contains(id)) {
        _trackedComplete.add(id);
        _onExerciseCompleted(id);
      } else if (!nowComplete && _trackedComplete.contains(id)) {
        _trackedComplete.remove(id);
      }
    }
  }

  @override
  void dispose() {
    _highlightTimer?.cancel();
    super.dispose();
  }

  /// Trova il prossimo esercizio non completato (escluso `currentId`).
  TemplateExerciseWithExercise? _nextIncompleteAfter(int currentId) {
    final list = state.exercisesOfDay;
    if (list.isEmpty) return null;
    final currentIdx = list.indexWhere(
      (e) => e.templateExercise.id == currentId,
    );
    // Cerca dal successivo in poi
    for (var i = currentIdx + 1; i < list.length; i++) {
      final id = list[i].templateExercise.id;
      if (state.editStates[id]?.isComplete != true) return list[i];
    }
    // Poi dall'inizio fino al precedente (caso utente che salta esercizi)
    for (var i = 0; i < currentIdx; i++) {
      final id = list[i].templateExercise.id;
      if (state.editStates[id]?.isComplete != true) return list[i];
    }
    return null;
  }

  void _onExerciseCompleted(int completedTplExId) {
    final next = _nextIncompleteAfter(completedTplExId);
    if (next == null) {
      // Tutti gli esercizi completati: invito a chiudere
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Tutti gli esercizi completati! Tocca Termina allenamento',
            ),
            duration: Duration(seconds: 3),
          ),
        );
      });
      return;
    }
    final nextId = next.templateExercise.id;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final key = _cardKeys[nextId];
      final ctx = key?.currentContext;
      if (ctx != null) {
        Scrollable.ensureVisible(
          ctx,
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeOutCubic,
          alignment: 0.1,
        );
      }
      setState(() => _highlightedTplExId = nextId);
      _highlightTimer?.cancel();
      _highlightTimer = Timer(const Duration(milliseconds: 1200), () {
        if (!mounted) return;
        setState(() => _highlightedTplExId = null);
      });
    });
  }

  Future<void> _onFinish(BuildContext context) async {
    final notifier = ref.read(sessionControllerProvider(logId).notifier);
    final completed = state.exercisesCompleted;
    final total = state.exercisesOfDay.length;

    final note = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _FinishSheet(
        completed: completed,
        total: total,
        elapsed: state.elapsed,
      ),
    );
    if (note == null || !context.mounted) return;

    final result = await notifier.finish(note: note.isEmpty ? null : note);
    if (!context.mounted) return;
    if (result.ok) {
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        barrierColor: Colors.black.withValues(alpha: 0.7),
        builder: (_) => const _CelebrationDialog(),
      );
      if (!context.mounted) return;
      ref.invalidate(assignmentsListProvider);
      ref.invalidate(assignmentHistoryProvider(assignmentId));
      Navigator.of(context).pop();
      if (result.offline) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Salvato offline. Sync automatico al rientro online.',
            ),
          ),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.error ?? 'Errore')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final exercises = state.exercisesOfDay;
    final notifier = ref.read(sessionControllerProvider(logId).notifier);

    // Prossimo esercizio non completato (per chip sopra timer)
    TemplateExerciseWithExercise? nextExercise;
    for (final ex in exercises) {
      if (state.editStates[ex.templateExercise.id]?.isComplete != true) {
        nextExercise = ex;
        break;
      }
    }

    return Scaffold(
      bottomNavigationBar: _FinishBottomBar(
        onPressed: state.finishing ? null : () => _onFinish(context),
        loading: state.finishing,
        completedExercises: state.exercisesCompleted,
        totalExercises: exercises.length,
      ),
      floatingActionButton: state.restTimer != null
          ? Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (nextExercise != null)
                  _NextExerciseChip(
                    exerciseRow: nextExercise,
                    onTap: () {
                      final key = _cardKeys[nextExercise!.templateExercise.id];
                      final ctx = key?.currentContext;
                      if (ctx != null) {
                        Scrollable.ensureVisible(
                          ctx,
                          duration: const Duration(milliseconds: 500),
                          curve: Curves.easeOutCubic,
                          alignment: 0.1,
                        );
                      }
                    },
                  ),
                const SizedBox(height: 8),
                _RestTimerOverlay(
                  timer: state.restTimer!,
                  onSkip: () => notifier.cancelRestTimer(),
                  onAdjust: (delta) => notifier.extendRestTimer(delta),
                ),
              ],
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverAppBar(
            pinned: true,
            stretch: true,
            expandedHeight: 180,
            iconTheme: const IconThemeData(color: AppColors.white),
            leading: IconButton(
              icon: const Icon(Icons.close_rounded),
              onPressed: widget.onExitRequest,
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
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
                alignment: Alignment.center,
                child: SafeArea(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(height: 16),
                      Text(
                        'GIORNO ${state.log.giorno ?? 1}'.toUpperCase(),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.white.withValues(alpha: 0.85),
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        formatStopwatch(state.elapsed),
                        style: const TextStyle(
                          fontSize: 44,
                          fontWeight: FontWeight.w800,
                          color: AppColors.white,
                          letterSpacing: -1,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                      const SizedBox(height: 4),
                      if (state.template != null)
                        Text(
                          state.template!.nomeTemplate,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: AppColors.white.withValues(alpha: 0.85),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
            sliver: SliverList.separated(
              itemCount: exercises.length,
              separatorBuilder: (_, _) => const SizedBox(height: 14),
              itemBuilder: (context, i) {
                final ex = exercises[i];
                final tplEx = ex.templateExercise;
                final exState = state.editStates[tplEx.id];
                if (exState == null) return const SizedBox.shrink();

                final cardKey = _cardKeys.putIfAbsent(
                  tplEx.id,
                  () => GlobalKey(),
                );

                return KeyedSubtree(
                  key: cardKey,
                  child: _ExerciseSessionCard(
                    workoutLogId: widget.logId,
                    exerciseRow: ex,
                    editState: exState,
                    saving: state.savingFlags[tplEx.id] ?? false,
                    lastLog: state.lastLogs[tplEx.id],
                    isPrCelebrating:
                        state.recentPrTemplateExerciseId == tplEx.id,
                    isHighlighted: _highlightedTplExId == tplEx.id,
                    onUpdate: (idx, {reps, weight, rpe, completed}) {
                      notifier.updateSet(
                        tplEx.id,
                        idx,
                        reps: reps,
                        weight: weight,
                        rpe: rpe,
                        completed: completed,
                      );
                    },
                    onAddSet: () => notifier.addSet(tplEx.id),
                    onRemoveSet: (idx) => notifier.removeSet(tplEx.id, idx),
                    onNoteChange: (n) => notifier.setNote(tplEx.id, n),
                  ),
                ).animate().fadeIn(
                      delay: Duration(milliseconds: 30 * i),
                      duration: 250.ms,
                    );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ───────────────────────────── Exercise Card ─────────────────────────────

class _ExerciseSessionCard extends StatefulWidget {
  const _ExerciseSessionCard({
    required this.workoutLogId,
    required this.exerciseRow,
    required this.editState,
    required this.saving,
    required this.lastLog,
    required this.isPrCelebrating,
    required this.isHighlighted,
    required this.onUpdate,
    required this.onAddSet,
    required this.onRemoveSet,
    required this.onNoteChange,
  });

  final int workoutLogId;
  final TemplateExerciseWithExercise exerciseRow;
  final ExerciseEditState editState;
  final bool saving;
  final LastExerciseLog? lastLog;
  final bool isPrCelebrating;
  final bool isHighlighted;
  final void Function(int setIdx, {int? reps, double? weight, int? rpe, bool? completed}) onUpdate;
  final VoidCallback onAddSet;
  final void Function(int setIdx) onRemoveSet;
  final void Function(String?) onNoteChange;

  @override
  State<_ExerciseSessionCard> createState() => _ExerciseSessionCardState();
}

class _ExerciseSessionCardState extends State<_ExerciseSessionCard> {
  int _tab = 0; // 0 = Esecuzione, 1 = Storico
  bool _userExpanded = false; // true se l'utente ha riaperto la card completata

  @override
  void didUpdateWidget(covariant _ExerciseSessionCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Se l'esercizio torna incompleto (utente uncheck), reset del flag user-expanded
    if (oldWidget.editState.isComplete && !widget.editState.isComplete) {
      _userExpanded = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tplEx = widget.exerciseRow.templateExercise;
    final ex = widget.exerciseRow.exercise;
    final editState = widget.editState;
    final lastLog = widget.lastLog;
    final saving = widget.saving;
    final isPrCelebrating = widget.isPrCelebrating;
    final collapsed = editState.isComplete && !_userExpanded;

    if (collapsed) {
      return _CollapsedExerciseCard(
        name: ex?.nome ?? 'Esercizio',
        ordine: tplEx.ordine,
        bestSet: editState.bestSet,
        setsTotal: editState.sets.length,
        onTap: () => setState(() => _userExpanded = true),
      );
    }

    return _HighlightWrapper(
      active: widget.isHighlighted,
      child: Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isPrCelebrating
              ? AppColors.brandAccent
              : editState.isComplete
                  ? theme.colorScheme.primary.withValues(alpha: 0.4)
                  : theme.colorScheme.outline,
          width: isPrCelebrating || editState.isComplete ? 1.5 : 1,
        ),
      ),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isPrCelebrating) const _PrBanner(),
          // Header
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: editState.isComplete
                      ? theme.colorScheme.primary
                      : theme.colorScheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: editState.isComplete
                    ? const Icon(Icons.check_rounded, color: AppColors.white, size: 20)
                    : Text(
                        '${tplEx.ordine + 1}',
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
                      Text(ex!.gruppoMuscolare!, style: theme.textTheme.bodySmall),
                    ],
                  ],
                ),
              ),
              if (saving)
                const SizedBox(
                  height: 16,
                  width: 16,
                  child: CircularProgressIndicator(strokeWidth: 1.6),
                )
              else if (editState.setsCompleted > 0)
                Text(
                  '${editState.setsCompleted}/${editState.sets.length}',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),

          // Target chips
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              if (tplEx.ripetizioni != null)
                _TargetChip(label: 'Reps', value: tplEx.ripetizioni!),
              if (tplEx.recupero != null)
                _TargetChip(label: 'Recupero', value: tplEx.recupero!),
              if (tplEx.rpe != null) _TargetChip(label: 'RPE', value: tplEx.rpe!),
            ],
          ),

          if (tplEx.noteTecniche != null && tplEx.noteTecniche!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.tips_and_updates_outlined,
                    size: 14,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      tplEx.noteTecniche!,
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          _ExerciseTabSwitcher(
            tab: _tab,
            onChanged: (t) => setState(() => _tab = t),
          ),
          const SizedBox(height: 12),
          if (_tab == 0) ...[
            _SetHeaderRow(),
            const SizedBox(height: 4),
            for (var i = 0; i < editState.sets.length; i++)
              _SetLoggerRow(
                setNum: i + 1,
                entry: editState.sets[i],
                onChanged: ({reps, weight, rpe, completed}) => widget.onUpdate(
                  i,
                  reps: reps,
                  weight: weight,
                  rpe: rpe,
                  completed: completed,
                ),
                onLongPress: editState.sets.length > 1
                    ? () => widget.onRemoveSet(i)
                    : null,
              ),
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: widget.onAddSet,
                icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                label: const Text('Aggiungi serie'),
              ),
            ),
          ] else ...[
            _LastLogView(log: lastLog),
          ],

          const SizedBox(height: 14),
          const Divider(height: 1),
          const SizedBox(height: 10),
          ExerciseAttachmentsSection(
            workoutLogId: widget.workoutLogId,
            templateExerciseId: tplEx.id,
            ordine: tplEx.ordine,
            compact: true,
          ),
        ],
      ),
      ),
    );
  }
}

class _CollapsedExerciseCard extends StatelessWidget {
  const _CollapsedExerciseCard({
    required this.name,
    required this.ordine,
    required this.bestSet,
    required this.setsTotal,
    required this.onTap,
  });

  final String name;
  final int ordine;
  final SetEntry? bestSet;
  final int setsTotal;
  final VoidCallback onTap;

  String? _bestSummary() {
    final s = bestSet;
    if (s == null) return null;
    final reps = s.reps;
    final w = s.weight;
    if (reps == null && w == null) return null;
    final wStr = w == null
        ? '—'
        : (w == w.truncateToDouble() ? w.toInt().toString() : w.toStringAsFixed(1));
    return reps != null ? '$reps reps × ${wStr}kg' : '${wStr}kg';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final summary = _bestSummary();
    return Material(
      color: theme.colorScheme.primary.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          decoration: BoxDecoration(
            border: Border.all(
              color: theme.colorScheme.primary.withValues(alpha: 0.35),
              width: 1,
            ),
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.check_rounded,
                  color: AppColors.white,
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (summary != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        '$setsTotal serie · best $summary',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Icon(
                Icons.expand_more_rounded,
                color: theme.colorScheme.primary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HighlightWrapper extends StatelessWidget {
  const _HighlightWrapper({required this.active, required this.child});
  final bool active;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (!active) return child;
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 1.0, end: 0.0),
      duration: const Duration(milliseconds: 1100),
      curve: Curves.easeOut,
      builder: (context, t, ch) {
        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            boxShadow: [
              BoxShadow(
                color: theme.colorScheme.primary.withValues(alpha: 0.45 * t),
                blurRadius: 14 * t + 4,
                spreadRadius: 2 * t,
              ),
            ],
          ),
          child: ch,
        );
      },
      child: child,
    );
  }
}

class _NextExerciseChip extends StatelessWidget {
  const _NextExerciseChip({required this.exerciseRow, required this.onTap});
  final TemplateExerciseWithExercise exerciseRow;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tplEx = exerciseRow.templateExercise;
    final name = exerciseRow.exercise?.nome ?? 'Esercizio';
    final targetParts = <String>[];
    if (tplEx.serie != null && tplEx.ripetizioni != null) {
      targetParts.add('${tplEx.serie}×${tplEx.ripetizioni}');
    } else if (tplEx.ripetizioni != null) {
      targetParts.add(tplEx.ripetizioni!);
    }
    final target = targetParts.join(' ');
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.pill),
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(AppRadius.pill),
            border: Border.all(
              color: theme.colorScheme.primary.withValues(alpha: 0.35),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.arrow_forward_rounded,
                size: 16,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: 'Prossimo · ',
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: theme.textTheme.bodySmall?.color,
                        ),
                      ),
                      TextSpan(
                        text: name,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                      if (target.isNotEmpty)
                        TextSpan(
                          text: ' · $target',
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                    ],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ExerciseTabSwitcher extends StatelessWidget {
  const _ExerciseTabSwitcher({required this.tab, required this.onChanged});
  final int tab;
  final void Function(int) onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Row(
        children: [
          Expanded(child: _tabButton(theme, 'Esecuzione', 0)),
          Expanded(child: _tabButton(theme, 'Storico pesi', 1)),
        ],
      ),
    );
  }

  Widget _tabButton(ThemeData theme, String label, int idx) {
    final selected = tab == idx;
    return InkWell(
      onTap: () => onChanged(idx),
      borderRadius: BorderRadius.circular(AppRadius.pill),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: selected ? theme.colorScheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.pill),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: selected ? AppColors.white : theme.textTheme.bodyMedium?.color,
            letterSpacing: 0.3,
          ),
        ),
      ),
    );
  }
}

class _LastLogView extends StatelessWidget {
  const _LastLogView({required this.log});
  final LastExerciseLog? log;

  String _daysAgo(DateTime d) {
    final diff = DateTime.now().difference(d).inDays;
    if (diff <= 0) return 'oggi';
    if (diff == 1) return 'ieri';
    if (diff < 7) return '$diff giorni fa';
    if (diff < 30) return '${(diff / 7).floor()} sett fa';
    return formatDateItShort(d);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l = log;
    if (l == null || l.repsActual.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        alignment: Alignment.center,
        child: Text(
          'Nessuna sessione precedente per questo esercizio.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodySmall,
        ),
      );
    }

    final reps = l.repsActual;
    final weights = l.weightActual;
    final rpes = l.rpeActual;
    final rows = <Widget>[];
    final n = reps.length;
    for (var i = 0; i < n; i++) {
      final r = reps[i].toInt();
      final w = i < weights.length ? weights[i].toDouble() : 0.0;
      final wStr = w == w.truncateToDouble()
          ? w.toInt().toString()
          : w.toStringAsFixed(1);
      final rpe = i < rpes.length ? rpes[i] : null;
      rows.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              SizedBox(
                width: 28,
                child: Text(
                  '${i + 1}',
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
              Expanded(
                child: Text(
                  '$r reps',
                  style: theme.textTheme.bodyMedium,
                ),
              ),
              Expanded(
                child: Text(
                  '$wStr kg',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ),
              SizedBox(
                width: 56,
                child: Text(
                  rpe != null ? 'RPE $rpe' : '—',
                  textAlign: TextAlign.right,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.textTheme.bodySmall?.color,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.brandAccent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(
          color: AppColors.brandAccent.withValues(alpha: 0.25),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.history_rounded,
                size: 14,
                color: AppColors.brandAccent,
              ),
              const SizedBox(width: 6),
              Text(
                'Ultima volta · ${_daysAgo(l.dateExecuted)}',
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.brandAccent,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...rows,
          if (l.note != null && l.note!.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.sticky_note_2_outlined,
                    size: 14,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(l.note!, style: theme.textTheme.bodySmall),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PrBanner extends StatelessWidget {
  const _PrBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.brandAccent,
            Color.lerp(AppColors.brandAccent, Colors.amber, 0.3)!,
          ],
        ),
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.emoji_events_rounded,
            color: AppColors.white,
            size: 18,
          )
              .animate(onPlay: (c) => c.repeat())
              .shake(hz: 4, duration: 600.ms)
              .then(delay: 600.ms),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'NUOVO PERSONAL RECORD!',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: AppColors.white,
                letterSpacing: 0.6,
              ),
            ),
          ),
        ],
      ),
    ).animate().scale(
          begin: const Offset(0.8, 0.8),
          end: const Offset(1, 1),
          duration: 300.ms,
          curve: Curves.elasticOut,
        );
  }
}

class _TargetChip extends StatelessWidget {
  const _TargetChip({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(
              text: '$label ',
              style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0.4),
            ),
            TextSpan(
              text: value,
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ───────────────────────────── Set rows ─────────────────────────────

class _SetHeaderRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final style = theme.textTheme.labelSmall?.copyWith(letterSpacing: 0.6);
    return Row(
      children: [
        SizedBox(width: 32, child: Text('SET', style: style)),
        Expanded(child: Center(child: Text('REPS', style: style))),
        const SizedBox(width: 8),
        Expanded(child: Center(child: Text('PESO (KG)', style: style))),
        const SizedBox(width: 8),
        SizedBox(width: 56, child: Center(child: Text('RPE', style: style))),
        const SizedBox(width: 4),
        const SizedBox(width: 36),
      ],
    );
  }
}

class _SetLoggerRow extends StatefulWidget {
  const _SetLoggerRow({
    required this.setNum,
    required this.entry,
    required this.onChanged,
    this.onLongPress,
  });

  final int setNum;
  final SetEntry entry;
  final void Function({int? reps, double? weight, int? rpe, bool? completed}) onChanged;
  final VoidCallback? onLongPress;

  @override
  State<_SetLoggerRow> createState() => _SetLoggerRowState();
}

class _SetLoggerRowState extends State<_SetLoggerRow> {
  late TextEditingController _repsCtrl;
  late TextEditingController _weightCtrl;

  @override
  void initState() {
    super.initState();
    _repsCtrl = TextEditingController(
      text: widget.entry.reps?.toString() ?? '',
    );
    _weightCtrl = TextEditingController(
      text: _formatWeight(widget.entry.weight),
    );
  }

  @override
  void didUpdateWidget(covariant _SetLoggerRow old) {
    super.didUpdateWidget(old);
    final newReps = widget.entry.reps?.toString() ?? '';
    if (_repsCtrl.text != newReps) _repsCtrl.text = newReps;
    final newWeight = _formatWeight(widget.entry.weight);
    if (_weightCtrl.text != newWeight) _weightCtrl.text = newWeight;
  }

  @override
  void dispose() {
    _repsCtrl.dispose();
    _weightCtrl.dispose();
    super.dispose();
  }

  String _formatWeight(double? w) {
    if (w == null) return '';
    if (w == w.truncateToDouble()) return w.toInt().toString();
    return w.toString();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final completed = widget.entry.completed;

    return GestureDetector(
      onLongPress: widget.onLongPress,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 2),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        decoration: BoxDecoration(
          color: completed
              ? theme.colorScheme.primary.withValues(alpha: 0.06)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.sm),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 32,
              child: Text(
                '${widget.setNum}',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: completed
                      ? theme.colorScheme.primary
                      : theme.colorScheme.onSurface,
                ),
              ),
            ),
            Expanded(
              child: _NumberField(
                controller: _repsCtrl,
                onChanged: (v) {
                  final n = int.tryParse(v);
                  if (n != null) {
                    widget.onChanged(reps: n);
                  } else if (v.isEmpty) {
                    widget.onChanged(reps: null);
                  }
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _NumberField(
                controller: _weightCtrl,
                allowDecimal: true,
                onChanged: (v) {
                  final n = double.tryParse(v.replaceAll(',', '.'));
                  if (n != null) {
                    widget.onChanged(weight: n);
                  } else if (v.isEmpty) {
                    widget.onChanged(weight: null);
                  }
                },
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              width: 56,
              child: _RpePicker(
                value: widget.entry.rpe,
                onChanged: (v) => widget.onChanged(rpe: v),
              ),
            ),
            const SizedBox(width: 4),
            _CompleteButton(
              completed: completed,
              onTap: () {
                HapticFeedback.mediumImpact();
                widget.onChanged(completed: !completed);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _NumberField extends StatelessWidget {
  const _NumberField({
    required this.controller,
    required this.onChanged,
    this.allowDecimal = false,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final bool allowDecimal;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return TextField(
      controller: controller,
      keyboardType: TextInputType.numberWithOptions(decimal: allowDecimal),
      textAlign: TextAlign.center,
      style: theme.textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.w700,
        fontFeatures: const [FontFeature.tabularFigures()],
      ),
      decoration: InputDecoration(
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        hintText: '—',
        fillColor: theme.colorScheme.surfaceContainerHighest,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: theme.colorScheme.primary, width: 1.5),
        ),
      ),
      onChanged: onChanged,
    );
  }
}

class _RpePicker extends StatelessWidget {
  const _RpePicker({required this.value, required this.onChanged});
  final int? value;
  final ValueChanged<int?> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () async {
          final selected = await showModalBottomSheet<int?>(
            context: context,
            backgroundColor: theme.colorScheme.surface,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            builder: (ctx) => SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 12),
                  Text('Seleziona RPE', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Wrap(
                    alignment: WrapAlignment.center,
                    children: [
                      for (var i = 5; i <= 10; i++)
                        Padding(
                          padding: const EdgeInsets.all(6),
                          child: ChoiceChip(
                            label: Text('$i'),
                            selected: value == i,
                            onSelected: (_) => Navigator.pop(ctx, i),
                          ),
                        ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: TextButton(
                      onPressed: () => Navigator.pop(ctx, null),
                      child: const Text('Rimuovi RPE'),
                    ),
                  ),
                ],
              ),
            ),
          );
          if (selected != null || value != null) {
            onChanged(selected);
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          alignment: Alignment.center,
          child: Text(
            value?.toString() ?? '—',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class _CompleteButton extends StatelessWidget {
  const _CompleteButton({required this.completed, required this.onTap});
  final bool completed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        height: 36,
        width: 36,
        decoration: BoxDecoration(
          color: completed
              ? theme.colorScheme.primary
              : theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: completed
                ? theme.colorScheme.primary
                : theme.colorScheme.outline,
          ),
        ),
        child: Icon(
          Icons.check_rounded,
          size: 20,
          color: completed
              ? AppColors.white
              : theme.textTheme.bodySmall?.color,
        ),
      ),
    );
  }
}

// ───────────────────────────── Bottom bar + Finish sheet ─────────────────────────────

class _FinishBottomBar extends StatelessWidget {
  const _FinishBottomBar({
    required this.onPressed,
    required this.loading,
    required this.completedExercises,
    required this.totalExercises,
  });

  final VoidCallback? onPressed;
  final bool loading;
  final int completedExercises;
  final int totalExercises;

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
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                completedExercises == totalExercises
                    ? Icons.check_circle_rounded
                    : Icons.fitness_center_rounded,
                size: 14,
                color: theme.textTheme.bodySmall?.color,
              ),
              const SizedBox(width: 6),
              Text(
                '$completedExercises di $totalExercises esercizi completati',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
          const SizedBox(height: 10),
          PrimaryButton(
            label: 'Finisci allenamento',
            icon: Icons.flag_rounded,
            onPressed: onPressed,
            loading: loading,
          ),
        ],
      ),
    );
  }
}

class _FinishSheet extends StatefulWidget {
  const _FinishSheet({
    required this.completed,
    required this.total,
    required this.elapsed,
  });

  final int completed;
  final int total;
  final Duration elapsed;

  @override
  State<_FinishSheet> createState() => _FinishSheetState();
}

class _FinishSheetState extends State<_FinishSheet> {
  final _noteCtrl = TextEditingController();

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final inset = MediaQuery.of(context).viewInsets.bottom;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: inset),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
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
              Text('Riepilogo allenamento', style: theme.textTheme.headlineSmall),
              const SizedBox(height: 16),
              _SummaryRow(label: 'Durata', value: formatDuration(widget.elapsed)),
              const SizedBox(height: 8),
              _SummaryRow(
                label: 'Esercizi completati',
                value: '${widget.completed} di ${widget.total}',
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _noteCtrl,
                maxLines: 3,
                maxLength: 500,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Note (facoltative)',
                  hintText: 'Come ti sei sentito? Il trainer le vedrà.',
                ),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: () => Navigator.pop(context, _noteCtrl.text.trim()),
                icon: const Icon(Icons.flag_rounded),
                label: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text('Conferma e finisci'),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.pop(context, null),
                child: const Text('Continua allenamento'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: theme.textTheme.bodyMedium),
        Text(
          value,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

// ───────────────────────────── Loading + Error ─────────────────────────────

class _LoadingState extends StatelessWidget {
  const _LoadingState();
  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

// ───────────────────────────── Rest timer overlay ─────────────────────────────

class _RestTimerOverlay extends StatelessWidget {
  const _RestTimerOverlay({
    required this.timer,
    required this.onSkip,
    required this.onAdjust,
  });

  final RestTimerState timer;
  final VoidCallback onSkip;
  final void Function(int deltaSeconds) onAdjust;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mm = timer.remaining.inMinutes.toString().padLeft(2, '0');
    final ss = timer.remaining.inSeconds
        .remainder(60)
        .toString()
        .padLeft(2, '0');

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        boxShadow: [
          BoxShadow(
            color: theme.colorScheme.primary.withValues(alpha: 0.35),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 38,
            height: 38,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: timer.progress,
                  strokeWidth: 3,
                  backgroundColor: AppColors.white.withValues(alpha: 0.25),
                  color: AppColors.white,
                ),
                const Icon(
                  Icons.timer_outlined,
                  size: 16,
                  color: AppColors.white,
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'RECUPERO · ${timer.exerciseLabel}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: AppColors.white,
                    letterSpacing: 0.6,
                  ),
                ),
                Text(
                  '$mm:$ss',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppColors.white,
                    letterSpacing: -0.4,
                    fontFeatures: [FontFeature.tabularFigures()],
                    height: 1,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          _AdjustButton(label: '-10s', onTap: () => onAdjust(-10)),
          const SizedBox(width: 4),
          _AdjustButton(label: '+10s', onTap: () => onAdjust(10)),
          IconButton(
            onPressed: onSkip,
            tooltip: 'Salta',
            icon: const Icon(
              Icons.skip_next_rounded,
              color: AppColors.white,
            ),
          ),
        ],
      ),
    ).animate().slideY(
          begin: 1,
          end: 0,
          duration: 250.ms,
          curve: Curves.easeOut,
        );
  }
}

// ───────────────────────────── Celebration dialog ─────────────────────────────

class _CelebrationDialog extends StatefulWidget {
  const _CelebrationDialog();

  @override
  State<_CelebrationDialog> createState() => _CelebrationDialogState();
}

class _CelebrationDialogState extends State<_CelebrationDialog> {
  @override
  void initState() {
    super.initState();
    HapticFeedback.heavyImpact();
    Future.delayed(const Duration(milliseconds: 1800), () {
      if (mounted) Navigator.of(context).pop();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      child: Container(
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              theme.colorScheme.primary,
              Color.lerp(theme.colorScheme.primary, AppColors.brandAccent, 0.5) ??
                  theme.colorScheme.primary,
            ],
          ),
          borderRadius: BorderRadius.circular(28),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                color: AppColors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.emoji_events_rounded,
                size: 56,
                color: AppColors.white,
              ),
            )
                .animate()
                .scale(
                  begin: const Offset(0.5, 0.5),
                  end: const Offset(1, 1),
                  duration: 350.ms,
                  curve: Curves.elasticOut,
                )
                .then()
                .shake(hz: 4, duration: 400.ms),
            const SizedBox(height: 20),
            const Text(
              'Allenamento\ncompletato!',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: AppColors.white,
                letterSpacing: -0.3,
                height: 1.2,
              ),
            ).animate(delay: 250.ms).fadeIn(duration: 400.ms).slideY(begin: 0.3),
            const SizedBox(height: 8),
            Text(
              'Ottimo lavoro! 💪',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.white.withValues(alpha: 0.85),
              ),
            ).animate(delay: 400.ms).fadeIn(duration: 400.ms),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onClose});
  final String message;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: onClose,
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.cloud_off_rounded, size: 56, color: AppColors.danger),
              const SizedBox(height: 16),
              Text('Errore caricamento sessione', style: theme.textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(message, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium),
            ],
          ),
        ),
      ),
    );
  }
}

class _AdjustButton extends StatelessWidget {
  const _AdjustButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.white.withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: AppColors.white,
          ),
        ),
      ),
    );
  }
}
