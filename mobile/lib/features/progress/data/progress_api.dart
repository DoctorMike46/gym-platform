import 'dart:io';

import 'package:dio/dio.dart';

import '../../../core/network/api_exception.dart';

class ProgressApi {
  ProgressApi(this._dio);
  final Dio _dio;

  // ─── Misurazioni ──────────────────────────────────────

  Future<List<Map<String, dynamic>>> listMeasurements() async {
    try {
      final r = await _dio.get<Map<String, dynamic>>('/api/v1/progress/measurements');
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['measurements'] as List<dynamic>).cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> addMeasurement({
    required String date,
    String? pesoKg,
    String? bodyFatPct,
    String? vitaCm,
    String? fianchiCm,
    String? pettoCm,
    String? braccioCm,
    String? cosciaCm,
    String? note,
  }) async {
    final body = <String, dynamic>{'date': date};
    if (pesoKg != null && pesoKg.isNotEmpty) body['peso_kg'] = pesoKg;
    if (bodyFatPct != null && bodyFatPct.isNotEmpty) body['body_fat_pct'] = bodyFatPct;
    if (vitaCm != null && vitaCm.isNotEmpty) body['vita_cm'] = vitaCm;
    if (fianchiCm != null && fianchiCm.isNotEmpty) body['fianchi_cm'] = fianchiCm;
    if (pettoCm != null && pettoCm.isNotEmpty) body['petto_cm'] = pettoCm;
    if (braccioCm != null && braccioCm.isNotEmpty) body['braccio_cm'] = braccioCm;
    if (cosciaCm != null && cosciaCm.isNotEmpty) body['coscia_cm'] = cosciaCm;
    if (note != null && note.isNotEmpty) body['note'] = note;

    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/v1/progress/measurements',
        data: body,
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> deleteMeasurement(int id) async {
    try {
      await _dio.delete<Map<String, dynamic>>('/api/v1/progress/measurements/$id');
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  // ─── Foto progressi ───────────────────────────────────

  Future<List<Map<String, dynamic>>> listPhotos() async {
    try {
      final r = await _dio.get<Map<String, dynamic>>('/api/v1/progress/photos');
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['photos'] as List<dynamic>).cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Map<String, dynamic>> presignPhotoUpload({
    required String type,
    required String filename,
    required String contentType,
  }) async {
    try {
      final r = await _dio.post<Map<String, dynamic>>(
        '/api/v1/media/presign-upload',
        data: {
          'purpose': 'progress_photo',
          'type': type,
          'filename': filename,
          'content_type': contentType,
        },
      );
      return r.data!['data'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Upload diretto a R2 con il signed URL ottenuto da presign.
  /// Usa un Dio "nudo" per evitare gli interceptor (no Authorization a R2).
  Future<void> uploadToR2({
    required String url,
    required Map<String, String> headers,
    required File file,
  }) async {
    final raw = Dio();
    try {
      final bytes = await file.readAsBytes();
      await raw.put<void>(
        url,
        data: Stream.fromIterable([bytes]),
        options: Options(
          headers: {
            ...headers,
            'Content-Length': bytes.length.toString(),
          },
        ),
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    } finally {
      raw.close();
    }
  }

  Future<void> registerPhoto({
    required String r2Key,
    required String type,
    required String date,
    String? note,
  }) async {
    final body = <String, dynamic>{
      'r2_key': r2Key,
      'type': type,
      'date': date,
    };
    if (note != null && note.isNotEmpty) body['note'] = note;
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/v1/progress/photos',
        data: body,
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<String> getPhotoSignedUrl(int photoId) async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        '/api/v1/progress/photos/$photoId',
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      return data['url'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> deletePhoto(int id) async {
    try {
      await _dio.delete<Map<String, dynamic>>('/api/v1/progress/photos/$id');
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}
