import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'pending_mutation.dart';

/// Storage Hive per le mutazioni in coda. Chiave Hive = `PendingMutation.key`
/// (idempotente: stessa chiave → upsert).
class PendingMutationStore {
  PendingMutationStore(this._box);
  final Box<dynamic> _box;

  static const _boxName = 'pending_mutations_v1';

  static Future<PendingMutationStore> open() async {
    final box = await Hive.openBox<dynamic>(_boxName);
    return PendingMutationStore(box);
  }

  List<PendingMutation> all() {
    final out = <PendingMutation>[];
    for (final raw in _box.values) {
      if (raw is Map) {
        final m = PendingMutation.fromJson(raw);
        if (m != null) out.add(m);
      }
    }
    out.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return out;
  }

  int get count => _box.length;

  Future<void> upsert(PendingMutation mutation) {
    return _box.put(mutation.key, mutation.toJson());
  }

  Future<void> remove(String key) => _box.delete(key);

  Future<void> markAttempt(String key, {String? error}) async {
    final raw = _box.get(key);
    if (raw is Map) {
      final m = PendingMutation.fromJson(raw);
      if (m != null) {
        await _box.put(
          key,
          m.copyWith(attempts: m.attempts + 1, lastError: error).toJson(),
        );
      }
    }
  }

  Stream<BoxEvent> watch() => _box.watch();
}

final pendingMutationStoreProvider = Provider<PendingMutationStore>((ref) {
  throw UnimplementedError(
    'pendingMutationStoreProvider deve essere overridden in main() con il valore caricato',
  );
});

final pendingMutationsCountProvider = StreamProvider<int>((ref) {
  final store = ref.watch(pendingMutationStoreProvider);
  // Emette il count corrente + uno ad ogni cambio della box
  return Stream<int>.multi((controller) {
    controller.add(store.count);
    final sub = store.watch().listen((_) {
      controller.add(store.count);
    });
    ref.onDispose(sub.cancel);
  });
});
