import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/sync/sync_worker.dart';
import '../data/workouts_repository.dart';
import '../domain/workout_models.dart';

/// Stato di un singolo set durante la registrazione.
@immutable
class SetEntry {
  const SetEntry({
    this.reps,
    this.weight,
    this.rpe,
    this.completed = false,
  });

  final int? reps;
  final double? weight;
  final int? rpe;
  final bool completed;

  SetEntry copyWith({
    int? reps,
    double? weight,
    int? rpe,
    bool? completed,
    bool clearReps = false,
    bool clearWeight = false,
    bool clearRpe = false,
  }) {
    return SetEntry(
      reps: clearReps ? null : (reps ?? this.reps),
      weight: clearWeight ? null : (weight ?? this.weight),
      rpe: clearRpe ? null : (rpe ?? this.rpe),
      completed: completed ?? this.completed,
    );
  }
}

/// Stato di un esercizio dentro la sessione.
@immutable
class ExerciseEditState {
  const ExerciseEditState({
    required this.templateExerciseId,
    required this.ordine,
    required this.sets,
    this.note,
  });

  final int templateExerciseId;
  final int ordine;
  final List<SetEntry> sets;
  final String? note;

  int get setsCompleted => sets.where((s) => s.completed).length;
  bool get isComplete => sets.isNotEmpty && sets.every((s) => s.completed);

  /// Peso massimo registrato in questa sessione (per il check PR).
  double get maxWeight {
    var max = 0.0;
    for (final s in sets) {
      if (s.completed && s.weight != null && s.weight! > max) {
        max = s.weight!;
      }
    }
    return max;
  }

  ExerciseEditState copyWithSets(List<SetEntry> sets) =>
      ExerciseEditState(
        templateExerciseId: templateExerciseId,
        ordine: ordine,
        sets: sets,
        note: note,
      );

  ExerciseEditState copyWithNote(String? note) =>
      ExerciseEditState(
        templateExerciseId: templateExerciseId,
        ordine: ordine,
        sets: sets,
        note: note,
      );
}

@immutable
class RestTimerState {
  const RestTimerState({
    required this.totalSeconds,
    required this.remaining,
    required this.exerciseLabel,
  });

  final int totalSeconds;
  final Duration remaining;
  final String exerciseLabel;

  double get progress {
    if (totalSeconds <= 0) return 0;
    return (1 - remaining.inMilliseconds / (totalSeconds * 1000)).clamp(0, 1);
  }

  RestTimerState copyWith({Duration? remaining}) => RestTimerState(
        totalSeconds: totalSeconds,
        remaining: remaining ?? this.remaining,
        exerciseLabel: exerciseLabel,
      );
}

@immutable
class SessionState {
  const SessionState({
    required this.log,
    required this.template,
    required this.exercisesOfDay,
    required this.editStates,
    required this.savingFlags,
    required this.elapsed,
    required this.lastLogs,
    this.recentPrTemplateExerciseId,
    this.restTimer,
    this.finishing = false,
  });

  /// Se != null, l'esercizio con questo id ha appena registrato un PR
  /// (peso > max della sessione precedente). Usato per mostrare l'animazione.
  final int? recentPrTemplateExerciseId;

  final WorkoutLog log;
  final WorkoutTemplate? template;
  final List<TemplateExerciseWithExercise> exercisesOfDay;

  /// Map: templateExerciseId → state corrente
  final Map<int, ExerciseEditState> editStates;

  /// Map: templateExerciseId → true se autosave in corso
  final Map<int, bool> savingFlags;

  /// Map: templateExerciseId → ultimo log "completed" del cliente (per "ultima volta…")
  final Map<int, LastExerciseLog?> lastLogs;

  /// Tempo trascorso dall'apertura della sessione (live).
  final Duration elapsed;

  /// Rest timer attivo (null = nessun recupero in corso).
  final RestTimerState? restTimer;

  final bool finishing;

  int get exercisesCompleted =>
      editStates.values.where((s) => s.isComplete).length;

  SessionState copyWith({
    Map<int, ExerciseEditState>? editStates,
    Map<int, bool>? savingFlags,
    Map<int, LastExerciseLog?>? lastLogs,
    Duration? elapsed,
    bool? finishing,
    RestTimerState? restTimer,
    int? recentPrTemplateExerciseId,
    bool clearRestTimer = false,
    bool clearPr = false,
  }) {
    return SessionState(
      log: log,
      template: template,
      exercisesOfDay: exercisesOfDay,
      editStates: editStates ?? this.editStates,
      savingFlags: savingFlags ?? this.savingFlags,
      lastLogs: lastLogs ?? this.lastLogs,
      elapsed: elapsed ?? this.elapsed,
      restTimer: clearRestTimer ? null : (restTimer ?? this.restTimer),
      recentPrTemplateExerciseId: clearPr
          ? null
          : (recentPrTemplateExerciseId ?? this.recentPrTemplateExerciseId),
      finishing: finishing ?? this.finishing,
    );
  }

  /// Restituisce true se l'esercizio ha un nuovo PR vs ultima sessione
  /// (max weight in sessione corrente > max weight ultimo log).
  bool isPersonalRecord(int templateExerciseId) {
    final ex = editStates[templateExerciseId];
    if (ex == null) return false;
    final cur = ex.maxWeight;
    if (cur <= 0) return false;
    final last = lastLogs[templateExerciseId];
    if (last == null || last.weightActual.isEmpty) return false;
    final prev = last.weightActual
        .map((w) => w.toDouble())
        .fold<double>(0, (a, b) => b > a ? b : a);
    return cur > prev;
  }
}

class SessionController extends StateNotifier<AsyncValue<SessionState>> {
  SessionController(this._repo, this._sync, this._logId)
      : super(const AsyncValue.loading()) {
    _initialize();
  }

  final WorkoutsRepository _repo;
  final SyncWorker _sync;
  final int _logId;

  final Map<int, Timer> _autosaveTimers = {};
  DateTime? _sessionStartedAt;
  Timer? _ticker;
  Timer? _restTicker;
  bool _disposed = false;

  Duration get _currentElapsed {
    final start = _sessionStartedAt;
    if (start == null) return Duration.zero;
    final diff = DateTime.now().difference(start);
    return diff.isNegative ? Duration.zero : diff;
  }

  static const _autosaveDelay = Duration(milliseconds: 800);

  Future<void> _initialize() async {
    try {
      final session = await _repo.getSessionDetail(_logId);
      final assignmentId = session.log.assignmentId;
      if (assignmentId == null) {
        throw StateError('Sessione senza assignment');
      }
      final detail = await _repo.getAssignmentDetail(assignmentId);
      final day = session.log.giorno ?? 1;

      final exercisesOfDay = detail.exercises
          .where((e) => e.templateExercise.giorno == day)
          .toList()
        ..sort(
          (a, b) => a.templateExercise.ordine.compareTo(b.templateExercise.ordine),
        );

      // Fetch parallelo dei "last logs" per pre-popolare i campi
      final teIds = exercisesOfDay.map((e) => e.templateExercise.id).toList();
      Map<int, LastExerciseLog?> lastLogs = const {};
      try {
        lastLogs = await _repo.getLastExerciseLogsBulk(teIds);
      } catch (e) {
        debugPrint('[session] last logs fetch failed: $e');
      }

      final editStates = <int, ExerciseEditState>{};
      for (final e in exercisesOfDay) {
        final tplEx = e.templateExercise;
        final targetSets = _parseTargetSets(tplEx.serie);

        final existing = session.exerciseLogs
            .where((l) => l.exerciseLog.templateExerciseId == tplEx.id)
            .toList();

        if (existing.isNotEmpty) {
          // Riapertura sessione: usa i valori già salvati
          editStates[tplEx.id] = _hydrate(tplEx, existing.first.exerciseLog);
        } else {
          // Nuova sessione: pre-popola con i valori dell'ultima sessione (se presenti)
          final last = lastLogs[tplEx.id];
          editStates[tplEx.id] = _prepopulate(tplEx, targetSets, last);
        }
      }

      // Anchor del stopwatch: created_at della session (server-side).
      // Se la sessione è stata aperta in passato (app killata e riaperta),
      // riprende da dove era. Se non c'è (offline o errore parsing), usa now.
      _sessionStartedAt = session.log.createdAt ?? DateTime.now();
      _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
        if (_disposed) return;
        final cur = state;
        if (cur is AsyncData<SessionState>) {
          state = AsyncData(cur.value.copyWith(elapsed: _currentElapsed));
        }
      });

      state = AsyncData(
        SessionState(
          log: session.log,
          template: session.template,
          exercisesOfDay: exercisesOfDay,
          editStates: editStates,
          savingFlags: const {},
          lastLogs: lastLogs,
          elapsed: _currentElapsed,
        ),
      );
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  /// Crea sets vuoti pre-popolati con reps/weight/rpe dell'ultima sessione,
  /// ma `completed=false` (l'utente deve confermare).
  static ExerciseEditState _prepopulate(
    WorkoutTemplateExercise tpl,
    int targetSets,
    LastExerciseLog? last,
  ) {
    if (last == null || last.repsActual.isEmpty) {
      return ExerciseEditState(
        templateExerciseId: tpl.id,
        ordine: tpl.ordine,
        sets: List.generate(targetSets, (_) => const SetEntry()),
      );
    }
    final n = targetSets > 0 ? targetSets : last.repsActual.length;
    final sets = <SetEntry>[];
    for (var i = 0; i < n; i++) {
      sets.add(
        SetEntry(
          reps: i < last.repsActual.length ? last.repsActual[i].toInt() : null,
          weight: i < last.weightActual.length
              ? last.weightActual[i].toDouble()
              : null,
          rpe: i < last.rpeActual.length && last.rpeActual[i] != null
              ? (last.rpeActual[i] as num).toInt()
              : null,
          // I valori sono pre-suggeriti, l'utente li conferma con il check.
          completed: false,
        ),
      );
    }
    return ExerciseEditState(
      templateExerciseId: tpl.id,
      ordine: tpl.ordine,
      sets: sets,
    );
  }

  static int _parseTargetSets(String? serie) {
    if (serie == null) return 3;
    final m = RegExp(r'\d+').firstMatch(serie);
    if (m == null) return 3;
    final n = int.tryParse(m.group(0)!) ?? 3;
    return n.clamp(1, 10);
  }

  static ExerciseEditState _hydrate(
    WorkoutTemplateExercise tpl,
    WorkoutExerciseLog log,
  ) {
    final n = [
      log.repsActual.length,
      log.weightActual.length,
      log.rpeActual.length,
      log.setsCompleted,
    ].fold<int>(0, (a, b) => a > b ? a : b);

    final sets = <SetEntry>[];
    for (var i = 0; i < n; i++) {
      sets.add(
        SetEntry(
          reps: i < log.repsActual.length ? log.repsActual[i].toInt() : null,
          weight: i < log.weightActual.length ? log.weightActual[i].toDouble() : null,
          rpe: i < log.rpeActual.length && log.rpeActual[i] != null
              ? (log.rpeActual[i] as num).toInt()
              : null,
          completed: i < log.setsCompleted,
        ),
      );
    }
    if (sets.isEmpty) {
      final target = _parseTargetSets(tpl.serie);
      sets.addAll(List.generate(target, (_) => const SetEntry()));
    }
    return ExerciseEditState(
      templateExerciseId: tpl.id,
      ordine: tpl.ordine,
      sets: sets,
      note: log.note,
    );
  }

  // ─── mutations ───────────────────────────────────────────

  void updateSet(
    int templateExerciseId,
    int setIndex, {
    int? reps,
    double? weight,
    int? rpe,
    bool? completed,
    bool clearReps = false,
    bool clearWeight = false,
    bool clearRpe = false,
  }) {
    final current = state;
    if (current is! AsyncData<SessionState>) return;
    final s = current.value;
    final exState = s.editStates[templateExerciseId];
    if (exState == null) return;
    if (setIndex < 0 || setIndex >= exState.sets.length) return;

    final wasCompleted = exState.sets[setIndex].completed;
    final sets = List<SetEntry>.from(exState.sets);
    sets[setIndex] = sets[setIndex].copyWith(
      reps: reps,
      weight: weight,
      rpe: rpe,
      completed: completed,
      clearReps: clearReps,
      clearWeight: clearWeight,
      clearRpe: clearRpe,
    );
    final newStates = Map<int, ExerciseEditState>.from(s.editStates);
    newStates[templateExerciseId] = exState.copyWithSets(sets);

    state = AsyncData(s.copyWith(editStates: newStates));
    _scheduleAutosave(templateExerciseId);

    // Se ho appena marcato un set come completato → avvia rest timer + check PR
    if (completed == true && !wasCompleted) {
      _startRestTimerForExercise(templateExerciseId);
      _checkPersonalRecord(templateExerciseId);
    }
  }

  void _checkPersonalRecord(int templateExerciseId) {
    final cur = state;
    if (cur is! AsyncData<SessionState>) return;
    final s = cur.value;
    if (!s.isPersonalRecord(templateExerciseId)) return;
    HapticFeedback.heavyImpact();
    state = AsyncData(s.copyWith(recentPrTemplateExerciseId: templateExerciseId));
    // Reset il flag dopo 4 secondi
    Future.delayed(const Duration(seconds: 4), () {
      if (_disposed) return;
      final c = state;
      if (c is AsyncData<SessionState> &&
          c.value.recentPrTemplateExerciseId == templateExerciseId) {
        state = AsyncData(c.value.copyWith(clearPr: true));
      }
    });
  }

  void addSet(int templateExerciseId) {
    final current = state;
    if (current is! AsyncData<SessionState>) return;
    final s = current.value;
    final exState = s.editStates[templateExerciseId];
    if (exState == null || exState.sets.length >= 10) return;
    final sets = List<SetEntry>.from(exState.sets)..add(const SetEntry());
    final newStates = Map<int, ExerciseEditState>.from(s.editStates);
    newStates[templateExerciseId] = exState.copyWithSets(sets);
    state = AsyncData(s.copyWith(editStates: newStates));
    _scheduleAutosave(templateExerciseId);
  }

  void removeSet(int templateExerciseId, int setIndex) {
    final current = state;
    if (current is! AsyncData<SessionState>) return;
    final s = current.value;
    final exState = s.editStates[templateExerciseId];
    if (exState == null || exState.sets.length <= 1) return;
    if (setIndex < 0 || setIndex >= exState.sets.length) return;
    final sets = List<SetEntry>.from(exState.sets)..removeAt(setIndex);
    final newStates = Map<int, ExerciseEditState>.from(s.editStates);
    newStates[templateExerciseId] = exState.copyWithSets(sets);
    state = AsyncData(s.copyWith(editStates: newStates));
    _scheduleAutosave(templateExerciseId);
  }

  void setNote(int templateExerciseId, String? note) {
    final current = state;
    if (current is! AsyncData<SessionState>) return;
    final s = current.value;
    final exState = s.editStates[templateExerciseId];
    if (exState == null) return;
    final newStates = Map<int, ExerciseEditState>.from(s.editStates);
    newStates[templateExerciseId] = exState.copyWithNote(note);
    state = AsyncData(s.copyWith(editStates: newStates));
    _scheduleAutosave(templateExerciseId);
  }

  // ─── autosave ────────────────────────────────────────────

  void _scheduleAutosave(int templateExerciseId) {
    _autosaveTimers[templateExerciseId]?.cancel();
    _autosaveTimers[templateExerciseId] = Timer(_autosaveDelay, () {
      _save(templateExerciseId);
    });
  }

  Future<void> _save(int templateExerciseId) async {
    final current = state;
    if (current is! AsyncData<SessionState>) return;
    final s = current.value;
    final exState = s.editStates[templateExerciseId];
    if (exState == null) return;

    final flags = Map<int, bool>.from(s.savingFlags)..[templateExerciseId] = true;
    state = AsyncData(s.copyWith(savingFlags: flags));

    final reps = <num>[];
    final weights = <num>[];
    final rpes = <num?>[];
    for (final set in exState.sets) {
      reps.add(set.reps ?? 0);
      weights.add(set.weight ?? 0);
      rpes.add(set.rpe);
    }

    try {
      await _repo.saveExerciseLog(
        logId: _logId,
        templateExerciseId: templateExerciseId,
        ordine: exState.ordine,
        setsCompleted: exState.setsCompleted,
        repsActual: reps,
        weightActual: weights,
        rpeActual: rpes,
        note: exState.note,
      );
      // Successo: rimuovi eventuale mutation pending precedente
      await _sync.store
          .remove('save_exercise_log:$_logId:$templateExerciseId');
    } catch (e) {
      // Errore (offline o altro) → enqueue per replay automatico
      debugPrint('[session] save failed, enqueuing: $e');
      await _sync.enqueue(
        SyncWorker.buildSaveExerciseLog(
          logId: _logId,
          templateExerciseId: templateExerciseId,
          ordine: exState.ordine,
          setsCompleted: exState.setsCompleted,
          repsActual: reps,
          weightActual: weights,
          rpeActual: rpes,
          note: exState.note,
        ),
      );
    }

    if (_disposed) return;
    final cur = state;
    if (cur is AsyncData<SessionState>) {
      final f = Map<int, bool>.from(cur.value.savingFlags)..remove(templateExerciseId);
      state = AsyncData(cur.value.copyWith(savingFlags: f));
    }
  }

  // ─── Rest timer ──────────────────────────────────────

  static int? _parseRecuperoSeconds(String? recupero) {
    if (recupero == null) return null;
    final s = recupero.trim().toLowerCase();
    if (s.isEmpty) return null;

    // Formati supportati: "60s", "90", "2 min", "1:30", "1' 30''", "1m30s"
    // Caso "MM:SS" o "M:SS"
    final colon = RegExp(r'^(\d+):(\d{1,2})$').firstMatch(s);
    if (colon != null) {
      final m = int.parse(colon.group(1)!);
      final sec = int.parse(colon.group(2)!);
      return m * 60 + sec;
    }

    // Caso "Nmin" / "N min" / "N minuti"
    final minMatch = RegExp(r'^(\d+)\s*(?:min|minuti|m)$').firstMatch(s);
    if (minMatch != null) {
      return int.parse(minMatch.group(1)!) * 60;
    }

    // Combinato "1m30s"
    final mixed = RegExp(r'^(\d+)\s*m(?:in)?\s*(\d+)\s*s$').firstMatch(s);
    if (mixed != null) {
      return int.parse(mixed.group(1)!) * 60 + int.parse(mixed.group(2)!);
    }

    // Solo numero o "Ns"
    final pure = RegExp(r'^(\d+)\s*s?$').firstMatch(s);
    if (pure != null) {
      final n = int.parse(pure.group(1)!);
      // Se il valore è < 10 lo interpretiamo come minuti, altrimenti secondi
      if (n < 10) return n * 60;
      return n;
    }
    return null;
  }

  void _startRestTimerForExercise(int templateExerciseId) {
    final current = state;
    if (current is! AsyncData<SessionState>) return;
    final s = current.value;
    final exRow = s.exercisesOfDay
        .where((e) => e.templateExercise.id == templateExerciseId)
        .toList();
    if (exRow.isEmpty) return;
    final tplEx = exRow.first.templateExercise;
    final exName = exRow.first.exercise?.nome ?? 'Esercizio';
    final seconds = _parseRecuperoSeconds(tplEx.recupero);
    if (seconds == null || seconds <= 0) return;
    startRestTimer(seconds: seconds, label: exName);
  }

  void startRestTimer({required int seconds, required String label}) {
    _restTicker?.cancel();
    final current = state;
    if (current is! AsyncData<SessionState>) return;

    state = AsyncData(
      current.value.copyWith(
        restTimer: RestTimerState(
          totalSeconds: seconds,
          remaining: Duration(seconds: seconds),
          exerciseLabel: label,
        ),
      ),
    );

    _restTicker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_disposed) return;
      final cur = state;
      if (cur is! AsyncData<SessionState>) return;
      final rt = cur.value.restTimer;
      if (rt == null) return;
      final next = rt.remaining - const Duration(seconds: 1);
      if (next.inSeconds <= 0) {
        _restTicker?.cancel();
        HapticFeedback.heavyImpact();
        state = AsyncData(cur.value.copyWith(clearRestTimer: true));
      } else {
        state = AsyncData(cur.value.copyWith(
          restTimer: rt.copyWith(remaining: next),
        ));
      }
    });
  }

  void extendRestTimer(int extraSeconds) {
    final current = state;
    if (current is! AsyncData<SessionState>) return;
    final rt = current.value.restTimer;
    if (rt == null) return;
    state = AsyncData(
      current.value.copyWith(
        restTimer: RestTimerState(
          totalSeconds: rt.totalSeconds + extraSeconds,
          remaining: rt.remaining + Duration(seconds: extraSeconds),
          exerciseLabel: rt.exerciseLabel,
        ),
      ),
    );
  }

  void cancelRestTimer() {
    _restTicker?.cancel();
    final current = state;
    if (current is! AsyncData<SessionState>) return;
    if (current.value.restTimer == null) return;
    state = AsyncData(current.value.copyWith(clearRestTimer: true));
  }

  /// Forza il flush degli autosave pendenti.
  Future<void> flushPending() async {
    final ids = _autosaveTimers.keys.toList();
    for (final id in ids) {
      _autosaveTimers[id]?.cancel();
      _autosaveTimers.remove(id);
      await _save(id);
    }
  }

  // ─── finish ──────────────────────────────────────────────

  Future<({bool ok, String? error, bool offline})> finish({String? note}) async {
    final current = state;
    if (current is! AsyncData<SessionState>) {
      return (ok: false, error: 'Stato non pronto', offline: false);
    }
    state = AsyncData(current.value.copyWith(finishing: true));
    final seconds = _currentElapsed.inSeconds;
    try {
      await flushPending();
      await _repo.finishSession(
        logId: _logId,
        totalDurationSeconds: seconds,
        note: note,
      );
      return (ok: true, error: null, offline: false);
    } catch (e) {
      // Errore di rete → enqueue per sync automatico
      if (isDioNetworkError(e)) {
        debugPrint('[session] finish offline, enqueuing');
        await _sync.enqueue(
          SyncWorker.buildFinishSession(
            logId: _logId,
            totalDurationSeconds: seconds,
            note: note,
          ),
        );
        return (ok: true, error: null, offline: true);
      }
      if (_disposed) {
        return (ok: false, error: 'Sessione chiusa', offline: false);
      }
      final cur = state;
      if (cur is AsyncData<SessionState>) {
        state = AsyncData(cur.value.copyWith(finishing: false));
      }
      return (
        ok: false,
        error: e is ApiException ? e.message : 'Errore conclusione',
        offline: false,
      );
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _ticker?.cancel();
    _restTicker?.cancel();
    for (final t in _autosaveTimers.values) {
      t.cancel();
    }
    _autosaveTimers.clear();
    super.dispose();
  }
}

final sessionControllerProvider = StateNotifierProvider.autoDispose
    .family<SessionController, AsyncValue<SessionState>, int>((ref, logId) {
  final repo = ref.watch(workoutsRepositoryProvider);
  final sync = ref.watch(syncWorkerProvider);
  return SessionController(repo, sync, logId);
});
