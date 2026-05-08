import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../domain/progress_models.dart';
import 'progress_api.dart';

class ProgressRepository {
  ProgressRepository(this._api);
  final ProgressApi _api;

  // ─── Misurazioni ─────────────────────────────────────

  Future<List<BodyMeasurement>> listMeasurements() async {
    final raw = await _api.listMeasurements();
    return raw.map(BodyMeasurement.fromJson).toList();
  }

  Future<void> addMeasurement({
    required DateTime date,
    String? pesoKg,
    String? bodyFatPct,
    String? vitaCm,
    String? fianchiCm,
    String? pettoCm,
    String? braccioCm,
    String? cosciaCm,
    String? note,
  }) {
    return _api.addMeasurement(
      date: _formatDate(date),
      pesoKg: pesoKg,
      bodyFatPct: bodyFatPct,
      vitaCm: vitaCm,
      fianchiCm: fianchiCm,
      pettoCm: pettoCm,
      braccioCm: braccioCm,
      cosciaCm: cosciaCm,
      note: note,
    );
  }

  Future<void> deleteMeasurement(int id) => _api.deleteMeasurement(id);

  // ─── Foto progressi ──────────────────────────────────

  Future<List<ProgressPhoto>> listPhotos() async {
    final raw = await _api.listPhotos();
    return raw.map(ProgressPhoto.fromJson).toList();
  }

  Future<int> uploadPhoto({
    required File file,
    required ProgressPhotoType type,
    required DateTime date,
    String? note,
  }) async {
    final filename = file.path.split('/').last;
    final contentType = _detectContentType(filename);

    final presign = await _api.presignPhotoUpload(
      type: type.apiValue,
      filename: filename,
      contentType: contentType,
    );
    final response = PresignUploadResponse.fromJson(presign);

    await _api.uploadToR2(
      url: response.uploadUrl,
      headers: response.headers,
      file: file,
    );

    await _api.registerPhoto(
      r2Key: response.r2Key,
      type: type.apiValue,
      date: _formatDate(date),
      note: note,
    );
    // Restituiamo 0 perché il backend non ritorna l'id; la lista verrà ricaricata.
    return 0;
  }

  Future<String> getPhotoSignedUrl(int photoId) =>
      _api.getPhotoSignedUrl(photoId);

  Future<void> deletePhoto(int id) => _api.deletePhoto(id);

  String _formatDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _detectContentType(String filename) {
    final lower = filename.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }
}

final progressRepositoryProvider = Provider<ProgressRepository>((ref) {
  return ProgressRepository(ProgressApi(ref.watch(dioProvider)));
});

final measurementsProvider =
    FutureProvider<List<BodyMeasurement>>((ref) async {
  final repo = ref.watch(progressRepositoryProvider);
  return repo.listMeasurements();
});

final photosProvider = FutureProvider<List<ProgressPhoto>>((ref) async {
  final repo = ref.watch(progressRepositoryProvider);
  return repo.listPhotos();
});

class WeeklyVolumeBucket {
  const WeeklyVolumeBucket({required this.weekStart, required this.volume});
  final DateTime weekStart;
  final int volume;
}

class MuscleGroupBucket {
  const MuscleGroupBucket({required this.gruppo, required this.count});
  final String gruppo;
  final int count;
}

class ProgressTrainingStats {
  const ProgressTrainingStats({
    required this.weeklyVolume,
    required this.muscleGroups,
  });
  final List<WeeklyVolumeBucket> weeklyVolume;
  final List<MuscleGroupBucket> muscleGroups;
}

final progressTrainingStatsProvider =
    FutureProvider<ProgressTrainingStats>((ref) async {
  final dio = ref.watch(dioProvider);
  final r = await dio.get<Map<String, dynamic>>('/api/v1/progress/stats');
  final data = r.data!['data'] as Map<String, dynamic>;
  final weeks = (data['weekly_volume'] as List<dynamic>)
      .cast<Map<String, dynamic>>()
      .map((e) => WeeklyVolumeBucket(
            weekStart: DateTime.parse(e['week_start'] as String),
            volume: (e['volume'] as num).toInt(),
          ))
      .toList();
  final groups = (data['muscle_groups'] as List<dynamic>)
      .cast<Map<String, dynamic>>()
      .map((e) => MuscleGroupBucket(
            gruppo: e['gruppo']?.toString() ?? 'Altro',
            count: (e['count'] as num).toInt(),
          ))
      .toList();
  return ProgressTrainingStats(weeklyVolume: weeks, muscleGroups: groups);
});
