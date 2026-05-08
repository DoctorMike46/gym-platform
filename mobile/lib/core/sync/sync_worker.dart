import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/workouts/data/workouts_repository.dart';
import 'pending_mutation.dart';
import 'pending_mutation_store.dart';

/// Replaya le mutazioni offline appena la connessione torna disponibile,
/// o all'app resume.
class SyncWorker with WidgetsBindingObserver {
  SyncWorker({
    required this.store,
    required this.workoutsRepo,
  }) {
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final online = results.any((r) => r != ConnectivityResult.none);
      if (online) flush();
    });
    WidgetsBinding.instance.addObserver(this);
  }

  final PendingMutationStore store;
  final WorkoutsRepository workoutsRepo;

  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _flushing = false;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      flush();
    }
  }

  /// Sostituisce/aggiunge una mutazione, poi tenta il flush.
  Future<void> enqueue(PendingMutation mutation) async {
    await store.upsert(mutation);
    flush();
  }

  /// Tenta di drenare la coda. Si auto-skippa se è già in corso.
  Future<void> flush() async {
    if (_flushing) return;
    _flushing = true;
    try {
      final online = await _isOnline();
      if (!online) return;

      final mutations = store.all();
      for (final m in mutations) {
        try {
          await _execute(m);
          await store.remove(m.key);
        } catch (e) {
          await store.markAttempt(m.key, error: e.toString());
          // Stop al primo errore — riproveremo al prossimo trigger
          break;
        }
      }
    } finally {
      _flushing = false;
    }
  }

  Future<bool> _isOnline() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((r) => r != ConnectivityResult.none);
  }

  Future<void> _execute(PendingMutation m) async {
    switch (m.type) {
      case MutationType.saveExerciseLog:
        final p = m.payload;
        await workoutsRepo.saveExerciseLog(
          logId: p['log_id'] as int,
          templateExerciseId: p['template_exercise_id'] as int,
          ordine: p['ordine'] as int,
          setsCompleted: p['sets_completed'] as int,
          repsActual: (p['reps_actual'] as List).cast<num>(),
          weightActual: (p['weight_actual'] as List).cast<num>(),
          rpeActual: (p['rpe_actual'] as List).map((e) => e is num ? e : null).toList(),
          note: p['note'] as String?,
        );
        break;
      case MutationType.finishSession:
        final p = m.payload;
        await workoutsRepo.finishSession(
          logId: p['log_id'] as int,
          totalDurationSeconds: p['total_duration_seconds'] as int,
          note: p['note'] as String?,
        );
        break;
    }
  }

  void dispose() {
    _connectivitySub?.cancel();
    WidgetsBinding.instance.removeObserver(this);
  }

  // ─── Helpers per costruire le mutation ─────────────────

  static PendingMutation buildSaveExerciseLog({
    required int logId,
    required int templateExerciseId,
    required int ordine,
    required int setsCompleted,
    required List<num> repsActual,
    required List<num> weightActual,
    required List<num?> rpeActual,
    String? note,
  }) {
    final payload = <String, dynamic>{
      'log_id': logId,
      'template_exercise_id': templateExerciseId,
      'ordine': ordine,
      'sets_completed': setsCompleted,
      'reps_actual': repsActual,
      'weight_actual': weightActual,
      'rpe_actual': rpeActual,
    };
    if (note != null) payload['note'] = note;
    return PendingMutation(
      key: 'save_exercise_log:$logId:$templateExerciseId',
      type: MutationType.saveExerciseLog,
      createdAt: DateTime.now(),
      payload: payload,
    );
  }

  static PendingMutation buildFinishSession({
    required int logId,
    required int totalDurationSeconds,
    String? note,
  }) {
    final payload = <String, dynamic>{
      'log_id': logId,
      'total_duration_seconds': totalDurationSeconds,
    };
    if (note != null) payload['note'] = note;
    return PendingMutation(
      key: 'finish_session:$logId',
      type: MutationType.finishSession,
      createdAt: DateTime.now(),
      payload: payload,
    );
  }
}

final syncWorkerProvider = Provider<SyncWorker>((ref) {
  final worker = SyncWorker(
    store: ref.watch(pendingMutationStoreProvider),
    workoutsRepo: ref.watch(workoutsRepositoryProvider),
  );
  // Flush opportunistico al boot
  Future.microtask(worker.flush);
  ref.onDispose(worker.dispose);
  return worker;
});

/// Determina se siamo online "abbastanza" per chiamate API
/// (utile per UX: snackbar "salvato offline, sync automatico").
final isOnlineProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map(
        (results) => results.any((r) => r != ConnectivityResult.none),
      );
});

bool isDioNetworkError(Object e) {
  // Helper per riconoscere errori di rete dal Dio
  final s = e.toString().toLowerCase();
  return s.contains('connection') ||
      s.contains('network') ||
      s.contains('socketexception') ||
      s.contains('host lookup') ||
      s.contains('timeout');
}

/// Centralizza il logging debug dello sync.
void logSync(String msg) {
  if (kDebugMode) debugPrint('[sync] $msg');
}
