import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../domain/extended_profile.dart';

class ProfileExtendedRepository {
  ProfileExtendedRepository(this._dio);
  final Dio _dio;

  Future<ExtendedProfile> fetchExtended() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/api/v1/me/profile/extended',
      );
      _ensureOk(res);
      final data = res.data!['data'] as Map<String, dynamic>;
      return ExtendedProfile.fromJson(data['profile'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> updatePhysical({
    String? peso,
    String? altezza,
    int? eta,
    String? dataDiNascita,
    String? sesso,
    String? livelloAttivita,
  }) async {
    await _patch('/api/v1/me/profile/physical', {
      if (peso != null) 'peso': peso,
      if (altezza != null) 'altezza': altezza,
      if (eta != null) 'eta': eta,
      if (dataDiNascita != null) 'data_di_nascita': dataDiNascita,
      if (sesso != null) 'sesso': sesso,
      if (livelloAttivita != null) 'livello_attivita': livelloAttivita,
    });
  }

  Future<void> updateGoals({
    String? obiettivo,
    int? timeframeSettimane,
    String? pesoTargetKg,
    String? motivazione,
  }) async {
    await _patch('/api/v1/me/profile/goals', {
      if (obiettivo != null) 'obiettivo': obiettivo,
      if (timeframeSettimane != null) 'timeframe_settimane': timeframeSettimane,
      if (pesoTargetKg != null) 'peso_target_kg': pesoTargetKg,
      if (motivazione != null) 'motivazione': motivazione,
    });
  }

  Future<void> updateNutritionPrefs({
    String? regimeAlimentare,
    List<String>? allergeni,
    List<String>? intolleranze,
    List<String>? preferenzeAlimenti,
    List<String>? esclusioniAlimenti,
    String? noteAggiuntive,
  }) async {
    await _patch('/api/v1/me/profile/nutrition-prefs', {
      if (regimeAlimentare != null) 'regime_alimentare': regimeAlimentare,
      if (allergeni != null) 'allergeni': allergeni,
      if (intolleranze != null) 'intolleranze': intolleranze,
      if (preferenzeAlimenti != null) 'preferenze_alimenti': preferenzeAlimenti,
      if (esclusioniAlimenti != null) 'esclusioni_alimenti': esclusioniAlimenti,
      if (noteAggiuntive != null) 'note_aggiuntive': noteAggiuntive,
    });
  }

  Future<LifestyleData> updateLifestyle({
    int? oreSonnoMedie,
    int? livelloStress,
    int? nPastiDie,
    List<String>? orariPasti,
    int? occasioniSocialiSettimana,
    String? consumoAcquaLitri,
    String? fumo,
    List<Integratore>? integratori,
  }) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>(
        '/api/v1/me/profile/lifestyle',
        data: {
          if (oreSonnoMedie != null) 'ore_sonno_medie': oreSonnoMedie,
          if (livelloStress != null) 'livello_stress': livelloStress,
          if (nPastiDie != null) 'n_pasti_die': nPastiDie,
          if (orariPasti != null) 'orari_pasti': orariPasti,
          if (occasioniSocialiSettimana != null)
            'occasioni_sociali_settimana': occasioniSocialiSettimana,
          if (consumoAcquaLitri != null) 'consumo_acqua_litri': consumoAcquaLitri,
          if (fumo != null) 'fumo': fumo,
          if (integratori != null)
            'integratori': integratori.map((i) => i.toJson()).toList(),
        },
      );
      _ensureOk(res);
      final data = res.data!['data'] as Map<String, dynamic>;
      return LifestyleData.fromJson(data['lifestyle'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<MedicalHistory> updateMedical({
    String? patologie,
    String? farmaci,
    String? note,
    bool? acceptDisclaimer,
  }) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>(
        '/api/v1/me/profile/medical',
        data: {
          if (patologie != null) 'patologie': patologie,
          if (farmaci != null) 'farmaci': farmaci,
          if (note != null) 'note': note,
          if (acceptDisclaimer != null) 'accept_disclaimer': acceptDisclaimer,
        },
      );
      _ensureOk(res);
      final data = res.data!['data'] as Map<String, dynamic>;
      return MedicalHistory.fromJson(data['medical'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> _patch(String path, Map<String, dynamic> data) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>(path, data: data);
      _ensureOk(res);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  void _ensureOk(Response response) {
    final code = response.statusCode ?? 0;
    if (code < 200 || code >= 300) {
      throw ApiException(
        code: 'http_$code',
        message: 'HTTP $code',
        statusCode: code,
      );
    }
  }
}

final profileExtendedRepositoryProvider =
    Provider<ProfileExtendedRepository>((ref) {
  return ProfileExtendedRepository(ref.watch(dioProvider));
});

final extendedProfileProvider = FutureProvider<ExtendedProfile>((ref) async {
  return ref.watch(profileExtendedRepositoryProvider).fetchExtended();
});
