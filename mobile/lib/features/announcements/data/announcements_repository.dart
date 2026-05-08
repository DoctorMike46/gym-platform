import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';

class Announcement {
  const Announcement({
    required this.id,
    required this.titolo,
    required this.contenuto,
    required this.tipo,
    this.imageR2Key,
    required this.createdAt,
    required this.updatedAt,
  });

  final int id;
  final String titolo;
  final String contenuto;
  final String tipo; // 'annuncio' | 'offerta'
  final String? imageR2Key;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isOffer => tipo == 'offerta';

  factory Announcement.fromJson(Map<String, dynamic> json) {
    return Announcement(
      id: (json['id'] as num).toInt(),
      titolo: json['titolo'] as String,
      contenuto: json['contenuto'] as String,
      tipo: json['tipo'] as String? ?? 'annuncio',
      imageR2Key: json['image_r2_key'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

class AnnouncementsRepository {
  AnnouncementsRepository(this._dio);
  final Dio _dio;

  Future<List<Announcement>> list() async {
    try {
      final r = await _dio.get<Map<String, dynamic>>('/api/v1/announcements');
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['announcements'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(Announcement.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final announcementsRepositoryProvider = Provider<AnnouncementsRepository>((ref) {
  return AnnouncementsRepository(ref.watch(dioProvider));
});

final announcementsListProvider =
    FutureProvider<List<Announcement>>((ref) async {
  return ref.watch(announcementsRepositoryProvider).list();
});
