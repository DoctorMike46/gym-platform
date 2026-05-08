import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';

class ClientStats {
  const ClientStats({
    required this.workoutsThisWeek,
    required this.workoutsThisMonth,
    required this.streakDays,
    required this.lastWeightKg,
    required this.lastWeightDate,
    required this.weightChange30d,
    required this.volumeThisWeek,
    required this.activeAssignments,
    required this.nextSuggested,
  });

  final int workoutsThisWeek;
  final int workoutsThisMonth;
  final int streakDays;
  final double? lastWeightKg;
  final DateTime? lastWeightDate;
  final double? weightChange30d;
  final int volumeThisWeek;
  final int activeAssignments;
  final NextSuggestedSession? nextSuggested;

  factory ClientStats.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null || v is! String) return null;
      return DateTime.tryParse(v);
    }

    final next = json['next_suggested'];
    return ClientStats(
      workoutsThisWeek: (json['workouts_this_week'] as num?)?.toInt() ?? 0,
      workoutsThisMonth: (json['workouts_this_month'] as num?)?.toInt() ?? 0,
      streakDays: (json['streak_days'] as num?)?.toInt() ?? 0,
      lastWeightKg: (json['last_weight_kg'] as num?)?.toDouble(),
      lastWeightDate: parseDate(json['last_weight_date']),
      weightChange30d: (json['weight_change_30d'] as num?)?.toDouble(),
      volumeThisWeek: (json['volume_this_week'] as num?)?.toInt() ?? 0,
      activeAssignments: (json['active_assignments'] as num?)?.toInt() ?? 0,
      nextSuggested: next is Map<String, dynamic>
          ? NextSuggestedSession.fromJson(next)
          : null,
    );
  }
}

class NextSuggestedSession {
  const NextSuggestedSession({
    required this.assignmentId,
    required this.giorno,
  });

  final int assignmentId;
  final int giorno;

  factory NextSuggestedSession.fromJson(Map<String, dynamic> json) {
    return NextSuggestedSession(
      assignmentId: (json['assignment_id'] as num).toInt(),
      giorno: (json['giorno'] as num).toInt(),
    );
  }
}

class StatsRepository {
  StatsRepository(this._dio);
  final Dio _dio;

  Future<ClientStats> getStats() async {
    try {
      final r = await _dio.get<Map<String, dynamic>>('/api/v1/stats');
      return ClientStats.fromJson(r.data!['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final statsRepositoryProvider = Provider<StatsRepository>((ref) {
  return StatsRepository(ref.watch(dioProvider));
});

final clientStatsProvider = FutureProvider<ClientStats>((ref) async {
  return ref.watch(statsRepositoryProvider).getStats();
});
