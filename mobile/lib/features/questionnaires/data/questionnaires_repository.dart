import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';

class QuestionnairePendingItem {
  const QuestionnairePendingItem({
    required this.assignmentId,
    required this.templateId,
    required this.nome,
    this.descrizione,
    required this.tipo,
    this.motivo,
    required this.sentAt,
  });

  final int assignmentId;
  final int templateId;
  final String nome;
  final String? descrizione;
  final String tipo;
  final String? motivo;
  final DateTime sentAt;

  factory QuestionnairePendingItem.fromJson(Map<String, dynamic> json) {
    return QuestionnairePendingItem(
      assignmentId: (json['assignment_id'] as num).toInt(),
      templateId: (json['template_id'] as num).toInt(),
      nome: json['nome'] as String,
      descrizione: json['descrizione'] as String?,
      tipo: json['tipo'] as String? ?? 'generico',
      motivo: json['motivo'] as String?,
      sentAt: DateTime.parse(json['sent_at'] as String).toLocal(),
    );
  }
}

enum QuestionType {
  text,
  textarea,
  number,
  radio,
  checkbox,
  scale,
  upload,
  confirm,
}

QuestionType _parseType(String? raw) {
  switch (raw) {
    case 'textarea':
      return QuestionType.textarea;
    case 'number':
      return QuestionType.number;
    case 'radio':
      return QuestionType.radio;
    case 'checkbox':
      return QuestionType.checkbox;
    case 'scale':
      return QuestionType.scale;
    case 'upload':
      return QuestionType.upload;
    case 'confirm':
      return QuestionType.confirm;
    case 'text':
    default:
      return QuestionType.text;
  }
}

class QuestionDef {
  const QuestionDef({
    required this.id,
    required this.type,
    required this.label,
    this.hint,
    required this.required,
    this.options,
    this.min,
    this.max,
  });

  final String id;
  final QuestionType type;
  final String label;
  final String? hint;
  final bool required;
  final List<String>? options;
  final int? min;
  final int? max;

  factory QuestionDef.fromJson(Map<String, dynamic> json) {
    return QuestionDef(
      id: json['id'] as String,
      type: _parseType(json['type'] as String?),
      label: json['label'] as String? ?? '',
      hint: json['hint'] as String?,
      required: json['required'] as bool? ?? false,
      options: (json['options'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
      min: (json['min'] as num?)?.toInt(),
      max: (json['max'] as num?)?.toInt(),
    );
  }
}

class QuestionSection {
  const QuestionSection({
    required this.id,
    required this.title,
    required this.questionIds,
  });

  final String id;
  final String title;
  final List<String> questionIds;

  factory QuestionSection.fromJson(Map<String, dynamic> json) {
    return QuestionSection(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      questionIds: (json['question_ids'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }
}

class QuestionnaireSchema {
  const QuestionnaireSchema({required this.questions, this.sections});
  final List<QuestionDef> questions;
  final List<QuestionSection>? sections;

  factory QuestionnaireSchema.fromJson(Map<String, dynamic> json) {
    return QuestionnaireSchema(
      questions: (json['questions'] as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>()
          .map(QuestionDef.fromJson)
          .toList(),
      sections: (json['sections'] as List<dynamic>?)
          ?.cast<Map<String, dynamic>>()
          .map(QuestionSection.fromJson)
          .toList(),
    );
  }
}

class QuestionnaireDetail {
  const QuestionnaireDetail({
    required this.assignmentId,
    required this.templateId,
    required this.nome,
    this.descrizione,
    required this.tipo,
    this.motivo,
    required this.status,
    required this.schema,
    this.existingAnswers,
  });

  final int assignmentId;
  final int templateId;
  final String nome;
  final String? descrizione;
  final String tipo;
  final String? motivo;
  final String status;
  final QuestionnaireSchema schema;
  /// Risposte già inviate (se status==completed)
  final Map<String, dynamic>? existingAnswers;

  factory QuestionnaireDetail.fromJson(Map<String, dynamic> data) {
    final assignment = data['assignment'] as Map<String, dynamic>;
    final template = data['template'] as Map<String, dynamic>;
    final response = data['response'] as Map<String, dynamic>?;
    return QuestionnaireDetail(
      assignmentId: (assignment['id'] as num).toInt(),
      templateId: (template['id'] as num).toInt(),
      nome: template['nome'] as String,
      descrizione: template['descrizione'] as String?,
      tipo: template['tipo'] as String? ?? 'generico',
      motivo: assignment['motivo'] as String?,
      status: assignment['status'] as String? ?? 'pending',
      schema: QuestionnaireSchema.fromJson(
        template['schema_json'] as Map<String, dynamic>,
      ),
      existingAnswers: (response?['response_json']) as Map<String, dynamic>?,
    );
  }
}

class QuestionnairesRepository {
  QuestionnairesRepository(this._dio);
  final Dio _dio;

  Future<List<QuestionnairePendingItem>> listPending() async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        '/api/v1/me/questionnaires',
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['questionnaires'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(QuestionnairePendingItem.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<QuestionnaireDetail> getDetail(int assignmentId) async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        '/api/v1/me/questionnaires/$assignmentId',
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      return QuestionnaireDetail.fromJson(data);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> submit(
    int assignmentId,
    Map<String, dynamic> answers,
  ) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/v1/me/questionnaires/$assignmentId/submit',
        data: {'answers': answers},
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Signed GET URL per visualizzare un allegato già caricato.
  Future<String?> getAttachmentSignedUrl(String r2Key) async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        '/api/v1/media/signed',
        queryParameters: {'key': r2Key},
      );
      return r.data?['data']?['url'] as String?;
    } on DioException {
      return null;
    }
  }

  /// Carica un allegato per una domanda di tipo `upload`:
  /// 1) chiede il presign URL
  /// 2) fa PUT diretto a R2 con i bytes
  /// 3) ritorna la r2_key da salvare come risposta
  Future<String> uploadAttachment({
    required int assignmentId,
    required String questionId,
    required String filename,
    required String contentType,
    required List<int> bytes,
  }) async {
    try {
      final r = await _dio.post<Map<String, dynamic>>(
        '/api/v1/me/questionnaires/$assignmentId/upload-presign',
        data: {
          'question_id': questionId,
          'filename': filename,
          'content_type': contentType,
        },
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      final uploadUrl = data['upload_url'] as String;
      final r2Key = data['r2_key'] as String;
      final headers = (data['headers'] as Map<String, dynamic>).map(
        (k, v) => MapEntry(k, v.toString()),
      );

      // Upload diretto a R2 con Dio "nudo" (no interceptor → no Authorization)
      final raw = Dio();
      try {
        await raw.put<void>(
          uploadUrl,
          data: Stream.fromIterable([bytes]),
          options: Options(
            headers: {
              ...headers,
              'Content-Length': bytes.length.toString(),
            },
          ),
        );
      } finally {
        raw.close();
      }
      return r2Key;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final questionnairesRepositoryProvider = Provider<QuestionnairesRepository>((
  ref,
) {
  return QuestionnairesRepository(ref.watch(dioProvider));
});

final pendingQuestionnairesProvider =
    FutureProvider<List<QuestionnairePendingItem>>((ref) async {
  return ref.watch(questionnairesRepositoryProvider).listPending();
});
