/// Tipi di mutazione differibile (eseguibili offline e replayate quando online).
enum MutationType {
  saveExerciseLog,
  finishSession;

  String get value => switch (this) {
        MutationType.saveExerciseLog => 'save_exercise_log',
        MutationType.finishSession => 'finish_session',
      };

  static MutationType? fromString(String? s) => switch (s) {
        'save_exercise_log' => MutationType.saveExerciseLog,
        'finish_session' => MutationType.finishSession,
        _ => null,
      };
}

class PendingMutation {
  const PendingMutation({
    required this.key,
    required this.type,
    required this.payload,
    required this.createdAt,
    this.attempts = 0,
    this.lastError,
  });

  /// Chiave univoca/idempotente per dedup. Esempi:
  ///   "save_exercise_log:LOGID:TEID"
  ///   "finish_session:LOGID"
  final String key;
  final MutationType type;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final int attempts;
  final String? lastError;

  Map<String, dynamic> toJson() => {
        'key': key,
        'type': type.value,
        'payload': payload,
        'created_at': createdAt.toIso8601String(),
        'attempts': attempts,
        if (lastError != null) 'last_error': lastError,
      };

  static PendingMutation? fromJson(Map<dynamic, dynamic> raw) {
    final type = MutationType.fromString(raw['type'] as String?);
    if (type == null) return null;
    final payload = raw['payload'];
    if (payload is! Map) return null;
    return PendingMutation(
      key: raw['key'] as String,
      type: type,
      payload: payload.map((k, v) => MapEntry(k.toString(), v)),
      createdAt: DateTime.tryParse(raw['created_at'] as String? ?? '') ?? DateTime.now(),
      attempts: (raw['attempts'] as num?)?.toInt() ?? 0,
      lastError: raw['last_error'] as String?,
    );
  }

  PendingMutation copyWith({int? attempts, String? lastError}) {
    return PendingMutation(
      key: key,
      type: type,
      payload: payload,
      createdAt: createdAt,
      attempts: attempts ?? this.attempts,
      lastError: lastError,
    );
  }
}
