// Modelli del dominio workouts. Mappano 1:1 le risposte di /api/v1/workouts/*.

class WorkoutAssignment {
  const WorkoutAssignment({
    required this.id,
    required this.clientId,
    required this.templateId,
    required this.dataAssegnazione,
    required this.attivo,
    this.note,
  });

  final int id;
  final int clientId;
  final int templateId;
  final DateTime dataAssegnazione;
  final bool attivo;
  final String? note;

  factory WorkoutAssignment.fromJson(Map<String, dynamic> json) {
    return WorkoutAssignment(
      id: (json['id'] as num).toInt(),
      clientId: (json['client_id'] as num).toInt(),
      templateId: (json['template_id'] as num).toInt(),
      dataAssegnazione: DateTime.parse(json['data_assegnazione'] as String),
      attivo: json['attivo'] as bool? ?? true,
      note: json['note'] as String?,
    );
  }
}

class WorkoutTemplate {
  const WorkoutTemplate({
    required this.id,
    this.trainerId,
    required this.nomeTemplate,
    this.splitSettimanale,
    this.noteProgressione,
  });

  final int id;
  // optional perché il session detail usa una proiezione ridotta senza trainer_id
  final int? trainerId;
  final String nomeTemplate;
  final int? splitSettimanale;
  final String? noteProgressione;

  factory WorkoutTemplate.fromJson(Map<String, dynamic> json) {
    return WorkoutTemplate(
      id: (json['id'] as num).toInt(),
      trainerId: json['trainer_id'] is num ? (json['trainer_id'] as num).toInt() : null,
      nomeTemplate: json['nome_template'] as String,
      splitSettimanale: json['split_settimanale'] is num
          ? (json['split_settimanale'] as num).toInt()
          : null,
      noteProgressione: json['note_progressione'] as String?,
    );
  }
}

/// Riga della lista assignments: {assignment, template}.
class WorkoutAssignmentWithTemplate {
  const WorkoutAssignmentWithTemplate({
    required this.assignment,
    this.template,
  });

  final WorkoutAssignment assignment;
  final WorkoutTemplate? template;

  factory WorkoutAssignmentWithTemplate.fromJson(Map<String, dynamic> json) {
    final tpl = json['template'];
    return WorkoutAssignmentWithTemplate(
      assignment: WorkoutAssignment.fromJson(json['assignment'] as Map<String, dynamic>),
      template: tpl is Map<String, dynamic> ? WorkoutTemplate.fromJson(tpl) : null,
    );
  }
}

class Exercise {
  const Exercise({
    required this.id,
    required this.nome,
    this.gruppoMuscolare,
    this.videoUrl,
    this.descrizione,
  });

  final int id;
  final String nome;
  final String? gruppoMuscolare;
  final String? videoUrl;
  final String? descrizione;

  factory Exercise.fromJson(Map<String, dynamic> json) {
    return Exercise(
      id: (json['id'] as num).toInt(),
      nome: json['nome'] as String,
      gruppoMuscolare: json['gruppo_muscolare'] as String?,
      videoUrl: json['video_url'] as String?,
      descrizione: json['descrizione'] as String?,
    );
  }
}

class WorkoutTemplateExercise {
  const WorkoutTemplateExercise({
    required this.id,
    required this.templateId,
    required this.exerciseId,
    required this.giorno,
    required this.ordine,
    this.serie,
    this.ripetizioni,
    this.recupero,
    this.rpe,
    this.noteTecniche,
  });

  final int id;
  final int templateId;
  final int exerciseId;
  final int giorno;
  final int ordine;
  final String? serie;
  final String? ripetizioni;
  final String? recupero;
  final String? rpe;
  final String? noteTecniche;

  factory WorkoutTemplateExercise.fromJson(Map<String, dynamic> json) {
    return WorkoutTemplateExercise(
      id: (json['id'] as num).toInt(),
      templateId: (json['template_id'] as num).toInt(),
      exerciseId: (json['exercise_id'] as num).toInt(),
      giorno: (json['giorno'] as num?)?.toInt() ?? 1,
      ordine: (json['ordine'] as num?)?.toInt() ?? 0,
      serie: json['serie'] as String?,
      ripetizioni: json['ripetizioni'] as String?,
      recupero: json['recupero'] as String?,
      rpe: json['rpe'] as String?,
      noteTecniche: json['note_tecniche'] as String?,
    );
  }
}

/// Riga del dettaglio: template_exercise + exercise.
class TemplateExerciseWithExercise {
  const TemplateExerciseWithExercise({
    required this.templateExercise,
    this.exercise,
  });

  final WorkoutTemplateExercise templateExercise;
  final Exercise? exercise;

  factory TemplateExerciseWithExercise.fromJson(Map<String, dynamic> json) {
    final ex = json['ex'];
    return TemplateExerciseWithExercise(
      templateExercise: WorkoutTemplateExercise.fromJson(json['te'] as Map<String, dynamic>),
      exercise: ex is Map<String, dynamic> ? Exercise.fromJson(ex) : null,
    );
  }
}

/// Risposta completa di GET /workouts/assignments/:id.
class WorkoutAssignmentDetail {
  const WorkoutAssignmentDetail({
    required this.assignment,
    required this.template,
    required this.exercises,
  });

  final WorkoutAssignment assignment;
  final WorkoutTemplate template;
  final List<TemplateExerciseWithExercise> exercises;

  factory WorkoutAssignmentDetail.fromJson(Map<String, dynamic> json) {
    return WorkoutAssignmentDetail(
      assignment: WorkoutAssignment.fromJson(json['assignment'] as Map<String, dynamic>),
      template: WorkoutTemplate.fromJson(json['template'] as Map<String, dynamic>),
      exercises: (json['exercises'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(TemplateExerciseWithExercise.fromJson)
          .toList(),
    );
  }

  /// Raggruppa esercizi per giorno (chiave = giorno, valore = lista esercizi ordinati).
  Map<int, List<TemplateExerciseWithExercise>> exercisesByDay() {
    final map = <int, List<TemplateExerciseWithExercise>>{};
    for (final e in exercises) {
      map.putIfAbsent(e.templateExercise.giorno, () => []).add(e);
    }
    for (final list in map.values) {
      list.sort((a, b) => a.templateExercise.ordine.compareTo(b.templateExercise.ordine));
    }
    return map;
  }
}

class WorkoutExerciseLog {
  const WorkoutExerciseLog({
    required this.id,
    required this.workoutLogId,
    required this.templateExerciseId,
    required this.ordine,
    required this.setsCompleted,
    required this.repsActual,
    required this.weightActual,
    required this.rpeActual,
    this.note,
  });

  final int id;
  final int workoutLogId;
  final int? templateExerciseId;
  final int ordine;
  final int setsCompleted;
  final List<num> repsActual;
  final List<num> weightActual;
  final List<num?> rpeActual;
  final String? note;

  factory WorkoutExerciseLog.fromJson(Map<String, dynamic> json) {
    List<num> parseNumList(dynamic v) {
      if (v is! List) return const [];
      return v.whereType<num>().toList();
    }

    List<num?> parseNullableNumList(dynamic v) {
      if (v is! List) return const [];
      return v.map((e) => e is num ? e : null).toList();
    }

    return WorkoutExerciseLog(
      id: (json['id'] as num).toInt(),
      workoutLogId: (json['workout_log_id'] as num).toInt(),
      templateExerciseId: json['template_exercise_id'] is num
          ? (json['template_exercise_id'] as num).toInt()
          : null,
      ordine: (json['ordine'] as num?)?.toInt() ?? 0,
      setsCompleted: (json['sets_completed'] as num?)?.toInt() ?? 0,
      repsActual: parseNumList(json['reps_actual']),
      weightActual: parseNumList(json['weight_actual']),
      rpeActual: parseNullableNumList(json['rpe_actual']),
      note: json['note'] as String?,
    );
  }
}

/// Riga di session detail (combinazione log + template_exercise + exercise).
class SessionExerciseLogRow {
  const SessionExerciseLogRow({
    required this.exerciseLog,
    this.templateExercise,
    this.exercise,
  });

  final WorkoutExerciseLog exerciseLog;
  final WorkoutTemplateExercise? templateExercise;
  final Exercise? exercise;

  factory SessionExerciseLogRow.fromJson(Map<String, dynamic> json) {
    final te = json['templateExercise'];
    final ex = json['exercise'];
    return SessionExerciseLogRow(
      exerciseLog: WorkoutExerciseLog.fromJson(json['exerciseLog'] as Map<String, dynamic>),
      templateExercise:
          te is Map<String, dynamic> ? WorkoutTemplateExercise.fromJson(te) : null,
      exercise: ex is Map<String, dynamic> ? Exercise.fromJson(ex) : null,
    );
  }
}

class WorkoutLogDetail {
  const WorkoutLogDetail({
    required this.log,
    this.template,
    required this.exerciseLogs,
  });

  final WorkoutLog log;
  final WorkoutTemplate? template;
  final List<SessionExerciseLogRow> exerciseLogs;

  factory WorkoutLogDetail.fromJson(Map<String, dynamic> json) {
    final tpl = json['template'];
    return WorkoutLogDetail(
      log: WorkoutLog.fromJson(json['log'] as Map<String, dynamic>),
      template: tpl is Map<String, dynamic> ? WorkoutTemplate.fromJson(tpl) : null,
      exerciseLogs: (json['exerciseLogs'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(SessionExerciseLogRow.fromJson)
          .toList(),
    );
  }
}

/// Workout log (sessione di allenamento eseguita o in corso).
class WorkoutLog {
  const WorkoutLog({
    required this.id,
    required this.clientId,
    required this.templateId,
    required this.assignmentId,
    required this.giorno,
    required this.dateExecuted,
    required this.status,
    this.totalDurationSeconds,
    this.note,
    this.trainerNote,
  });

  final int id;
  final int clientId;
  final int? templateId;
  final int? assignmentId;
  final int? giorno;
  final DateTime dateExecuted;
  final String status; // 'in_progress' | 'completed' | 'skipped'
  final int? totalDurationSeconds;
  final String? note;
  final String? trainerNote;

  bool get isCompleted => status == 'completed';
  bool get isInProgress => status == 'in_progress';

  factory WorkoutLog.fromJson(Map<String, dynamic> json) {
    return WorkoutLog(
      id: (json['id'] as num).toInt(),
      clientId: (json['client_id'] as num).toInt(),
      templateId: json['template_id'] is num ? (json['template_id'] as num).toInt() : null,
      assignmentId:
          json['assignment_id'] is num ? (json['assignment_id'] as num).toInt() : null,
      giorno: json['giorno'] is num ? (json['giorno'] as num).toInt() : null,
      dateExecuted: DateTime.parse(json['date_executed'] as String),
      status: json['status'] as String? ?? 'in_progress',
      totalDurationSeconds:
          json['total_duration_seconds'] is num ? (json['total_duration_seconds'] as num).toInt() : null,
      note: json['note'] as String?,
      trainerNote: json['trainer_note'] as String?,
    );
  }
}
