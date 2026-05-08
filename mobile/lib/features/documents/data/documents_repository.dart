import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/env.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';

class ClientDocument {
  const ClientDocument({
    required this.id,
    required this.tipo,
    required this.nomeFile,
    required this.r2Key,
    this.mimeType,
    this.dimensioneBytes,
    this.note,
    required this.dataDocumento,
    required this.createdAt,
  });

  final int id;
  final String tipo;
  final String nomeFile;
  final String r2Key;
  final String? mimeType;
  final int? dimensioneBytes;
  final String? note;
  final DateTime dataDocumento;
  final DateTime createdAt;

  bool get isPdf =>
      (mimeType?.contains('pdf') ?? false) || nomeFile.toLowerCase().endsWith('.pdf');

  String get tipoLabel {
    switch (tipo) {
      case 'consenso':
        return 'Consenso';
      case 'scheda':
        return 'Scheda';
      case 'foto_progresso':
        return 'Foto progresso';
      default:
        return tipo;
    }
  }

  factory ClientDocument.fromJson(Map<String, dynamic> json) {
    return ClientDocument(
      id: (json['id'] as num).toInt(),
      tipo: json['tipo_documento'] as String,
      nomeFile: json['nome_file'] as String,
      r2Key: json['r2_key'] as String,
      mimeType: json['mime_type'] as String?,
      dimensioneBytes: json['dimensione_bytes'] is num
          ? (json['dimensione_bytes'] as num).toInt()
          : null,
      note: json['note'] as String?,
      dataDocumento: DateTime.parse(json['data_documento'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

class DocumentsRepository {
  DocumentsRepository(this._dio);
  final Dio _dio;

  Future<List<ClientDocument>> list() async {
    try {
      final r = await _dio.get<Map<String, dynamic>>('/api/v1/documents');
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['documents'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(ClientDocument.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// URL HTTP completo per aprire in browser/launcher esterno.
  /// L'endpoint backend redireziona a un signed URL R2 (302).
  String downloadUrl(int id) => '${Env.apiBaseUrl}/api/v1/documents/$id/download';

  /// Restituisce il signed URL R2 direttamente (utile per WebView/PDF inline).
  Future<String> getSignedUrl(int id) async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        '/api/v1/documents/$id/download',
        queryParameters: {'json': '1'},
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      return data['url'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final documentsRepositoryProvider = Provider<DocumentsRepository>((ref) {
  return DocumentsRepository(ref.watch(dioProvider));
});

final documentsListProvider = FutureProvider<List<ClientDocument>>((ref) async {
  return ref.watch(documentsRepositoryProvider).list();
});
