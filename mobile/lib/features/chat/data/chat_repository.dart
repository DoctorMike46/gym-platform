import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/env.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage.dart';

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.senderRole,
    required this.body,
    this.attachmentR2Key,
    this.attachmentMimeType,
    this.readAt,
    required this.createdAt,
  });

  final int id;
  final String senderRole; // 'trainer' | 'client'
  final String body;
  final String? attachmentR2Key;
  final String? attachmentMimeType;
  final DateTime? readAt;
  final DateTime createdAt;

  bool get isMine => senderRole == 'client';

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: (json['id'] as num).toInt(),
      senderRole: json['sender_role'] as String? ?? 'client',
      body: json['body'] as String? ?? '',
      attachmentR2Key: json['attachment_r2_key'] as String?,
      attachmentMimeType: json['attachment_mime_type'] as String?,
      readAt: (json['read_at'] as String?) != null
          ? DateTime.parse(json['read_at'] as String).toLocal()
          : null,
      createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
    );
  }
}

class ChatRepository {
  ChatRepository(this._dio, this._storage);
  final Dio _dio;
  final SecureStorage _storage;

  /// Lista messaggi (cronologico ascendente, i più vecchi per primi).
  Future<List<ChatMessage>> fetchMessages({int? beforeId, int limit = 50}) async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        '/api/v1/me/chat/messages',
        queryParameters: {
          'limit': limit,
          // ignore: use_null_aware_elements
          if (beforeId != null) 'before_id': beforeId,
        },
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['messages'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(ChatMessage.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Invia un messaggio. Ritorna il messaggio creato (con id assegnato).
  Future<ChatMessage> sendMessage(String body) async {
    try {
      final r = await _dio.post<Map<String, dynamic>>(
        '/api/v1/me/chat/messages',
        data: {'body': body},
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      return ChatMessage.fromJson(data['message'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Marca come letti tutti i messaggi del trainer.
  Future<void> markAsRead() async {
    try {
      await _dio.patch<Map<String, dynamic>>('/api/v1/me/chat/messages');
    } on DioException catch (_) {
      // best-effort
    }
  }

  /// Apre uno stream SSE che emette nuovi messaggi in arrivo.
  /// Riconnessione automatica con backoff.
  Stream<ChatMessage> streamNewMessages({required int afterId}) async* {
    var lastId = afterId;
    var backoff = const Duration(seconds: 2);
    while (true) {
      try {
        final token = await _storage.getAccessToken();
        if (token == null || token.isEmpty) {
          await Future.delayed(const Duration(seconds: 5));
          continue;
        }
        final controller = StreamController<ChatMessage>();
        final cancelToken = CancelToken();

        unawaited(_runSseConnection(
          url:
              '${Env.apiBaseUrl}/api/v1/me/chat/stream?after_id=$lastId',
          token: token,
          cancelToken: cancelToken,
          onMessage: (m) {
            controller.add(m);
            if (m.id > lastId) lastId = m.id;
          },
          onError: (_) {
            if (!controller.isClosed) controller.close();
          },
          onDone: () {
            if (!controller.isClosed) controller.close();
          },
        ));

        await for (final msg in controller.stream) {
          backoff = const Duration(seconds: 2); // reset on success
          yield msg;
        }

        cancelToken.cancel('reconnect');
      } catch (_) {
        // ignored, riprova
      }
      await Future.delayed(backoff);
      // backoff esponenziale con cap a 30s
      final next = backoff.inSeconds * 2;
      backoff = Duration(seconds: next > 30 ? 30 : next);
    }
  }

  Future<void> _runSseConnection({
    required String url,
    required String token,
    required CancelToken cancelToken,
    required void Function(ChatMessage) onMessage,
    required void Function(Object) onError,
    required void Function() onDone,
  }) async {
    final dio = Dio();
    try {
      final response = await dio.get<ResponseBody>(
        url,
        options: Options(
          responseType: ResponseType.stream,
          headers: {
            'Authorization': 'Bearer $token',
            'Accept': 'text/event-stream',
          },
        ),
        cancelToken: cancelToken,
      );
      final stream = response.data!.stream;
      String buffer = '';
      String currentEvent = 'message';
      await for (final chunk in stream) {
        buffer += utf8.decode(chunk, allowMalformed: true);
        while (true) {
          final idx = buffer.indexOf('\n\n');
          if (idx < 0) break;
          final raw = buffer.substring(0, idx);
          buffer = buffer.substring(idx + 2);
          final lines = raw.split('\n');
          String? dataLine;
          for (final line in lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              dataLine = (dataLine ?? '') + line.substring(5).trim();
            } else if (line.startsWith(':')) {
              // keep-alive
            }
          }
          if (dataLine == null) continue;
          if (currentEvent == 'message') {
            try {
              final json = jsonDecode(dataLine) as Map<String, dynamic>;
              onMessage(ChatMessage.fromJson(json));
            } catch (_) {/* skip */}
          }
          currentEvent = 'message';
        }
      }
      onDone();
    } catch (e) {
      onError(e);
    } finally {
      dio.close();
    }
  }
}

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepository(
    ref.watch(dioProvider),
    ref.watch(secureStorageProvider),
  );
});
