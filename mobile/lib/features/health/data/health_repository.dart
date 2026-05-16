import 'dart:async';
import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:health/health.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';

/// Tipi supportati lato backend.
class HealthSampleTypes {
  static const weight = 'weight';
  static const steps = 'steps';
  static const heartRateResting = 'heart_rate_resting';
  static const activeEnergy = 'active_energy';
  static const sleepHours = 'sleep_hours';
  static const workoutMinutes = 'workout_minutes';
}

class HealthSample {
  const HealthSample({
    required this.id,
    required this.type,
    required this.value,
    required this.unit,
    required this.recordedAt,
    required this.source,
  });

  final int id;
  final String type;
  final String value;
  final String unit;
  final DateTime recordedAt;
  final String source;

  double get valueAsDouble => double.tryParse(value) ?? 0;

  factory HealthSample.fromJson(Map<String, dynamic> json) {
    return HealthSample(
      id: (json['id'] as num).toInt(),
      type: json['type'] as String,
      value: json['value'] as String,
      unit: json['unit'] as String,
      recordedAt: DateTime.parse(json['recorded_at'] as String).toLocal(),
      source: json['source'] as String,
    );
  }
}

class HealthSnapshot {
  const HealthSnapshot({required this.samples, required this.latest});
  final List<HealthSample> samples;
  final Map<String, HealthSample> latest;
}

class HealthRepository {
  HealthRepository(this._dio);
  final Dio _dio;

  /// Fetch storico campioni dal backend.
  Future<HealthSnapshot> fetch({int days = 30, List<String>? types}) async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        '/api/v1/me/health',
        queryParameters: {
          'days': days,
          if (types != null && types.isNotEmpty) 'types': types.join(','),
        },
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      final samples = (data['samples'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(HealthSample.fromJson)
          .toList();
      final latestRaw = data['latest'] as Map<String, dynamic>;
      final latest = <String, HealthSample>{};
      for (final entry in latestRaw.entries) {
        latest[entry.key] =
            HealthSample.fromJson(entry.value as Map<String, dynamic>);
      }
      return HealthSnapshot(samples: samples, latest: latest);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Invia un batch di campioni raccolti da HealthKit / Health Connect.
  Future<int> syncSamples(
    List<Map<String, dynamic>> samples,
  ) async {
    if (samples.isEmpty) return 0;
    try {
      final r = await _dio.post<Map<String, dynamic>>(
        '/api/v1/me/health/sync',
        data: {'samples': samples},
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['inserted'] as num?)?.toInt() ?? 0;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final healthRepositoryProvider = Provider<HealthRepository>((ref) {
  return HealthRepository(ref.watch(dioProvider));
});

/// Bridge tra il package `health` (HealthKit / Health Connect) e il backend.
class HealthSyncService {
  HealthSyncService(this._repo);
  final HealthRepository _repo;

  static const _types = <HealthDataType>[
    HealthDataType.WEIGHT,
    HealthDataType.STEPS,
    HealthDataType.RESTING_HEART_RATE,
    HealthDataType.ACTIVE_ENERGY_BURNED,
    HealthDataType.SLEEP_ASLEEP,
    HealthDataType.WORKOUT,
  ];

  String get _source =>
      Platform.isIOS ? 'apple_health' : 'health_connect';

  /// Richiede l'autorizzazione per leggere i tipi supportati.
  /// Ritorna true se almeno alcuni permessi sono stati concessi.
  Future<bool> requestAuthorization() async {
    final health = Health();
    await health.configure();
    final permissions =
        List<HealthDataAccess>.filled(_types.length, HealthDataAccess.READ);
    return health.requestAuthorization(_types, permissions: permissions);
  }

  /// Esegue il fetch dei dati e li manda al backend.
  /// Ritorna il numero di campioni inseriti.
  Future<int> fetchAndSync({int daysBack = 30}) async {
    final health = Health();
    await health.configure();

    final now = DateTime.now();
    final start = now.subtract(Duration(days: daysBack));

    final dataPoints = await health.getHealthDataFromTypes(
      types: _types,
      startTime: start,
      endTime: now,
    );

    final batch = <Map<String, dynamic>>[];
    for (final p in dataPoints) {
      final mapped = _mapDataPoint(p);
      if (mapped != null) batch.add(mapped);
    }

    return _repo.syncSamples(batch);
  }

  Map<String, dynamic>? _mapDataPoint(HealthDataPoint p) {
    final mappedType = _mapType(p.type);
    if (mappedType == null) return null;

    String? value;
    final raw = p.value;
    if (raw is NumericHealthValue) {
      value = raw.numericValue.toString();
    } else if (raw is WorkoutHealthValue) {
      final mins = (p.dateTo.difference(p.dateFrom).inSeconds / 60).round();
      value = mins.toString();
    } else if (raw is num) {
      value = raw.toString();
    }
    if (value == null) return null;

    return {
      'type': mappedType,
      'value': value,
      'unit': _unitFor(mappedType),
      'recorded_at': p.dateTo.toUtc().toIso8601String(),
      'source': _source,
    };
  }

  String? _mapType(HealthDataType t) {
    switch (t) {
      case HealthDataType.WEIGHT:
        return HealthSampleTypes.weight;
      case HealthDataType.STEPS:
        return HealthSampleTypes.steps;
      case HealthDataType.RESTING_HEART_RATE:
        return HealthSampleTypes.heartRateResting;
      case HealthDataType.ACTIVE_ENERGY_BURNED:
        return HealthSampleTypes.activeEnergy;
      case HealthDataType.SLEEP_ASLEEP:
        return HealthSampleTypes.sleepHours;
      case HealthDataType.WORKOUT:
        return HealthSampleTypes.workoutMinutes;
      default:
        return null;
    }
  }

  String _unitFor(String mappedType) {
    switch (mappedType) {
      case HealthSampleTypes.weight:
        return 'kg';
      case HealthSampleTypes.steps:
        return 'count';
      case HealthSampleTypes.heartRateResting:
        return 'bpm';
      case HealthSampleTypes.activeEnergy:
        return 'kcal';
      case HealthSampleTypes.sleepHours:
      case HealthSampleTypes.workoutMinutes:
        return 'min';
      default:
        return '';
    }
  }
}

final healthSyncServiceProvider = Provider<HealthSyncService>((ref) {
  return HealthSyncService(ref.watch(healthRepositoryProvider));
});

final healthSnapshotProvider = FutureProvider<HealthSnapshot>((ref) async {
  return ref.watch(healthRepositoryProvider).fetch(days: 30);
});
