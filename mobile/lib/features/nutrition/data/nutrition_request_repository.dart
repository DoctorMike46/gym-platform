import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../domain/nutrition_request.dart';

class CreateNutritionRequestPayload {
  CreateNutritionRequestPayload({
    required this.obiettivo,
    this.timeframeSettimane,
    this.pesoTargetKg,
    this.motivazione,
    this.regimeAlimentare,
    this.allergeni,
    this.intolleranze,
    this.cibiPreferiti,
    this.cibiEvitati,
    this.nPastiDie,
    this.orariPasti,
    this.occasioniSociali,
    this.oreSonno,
    this.livelloStress,
    this.consumoAcquaLitri,
    this.fumo,
    this.integratori,
    this.patologie,
    this.farmaci,
    this.noteLibere,
  });

  final String obiettivo;
  final int? timeframeSettimane;
  final String? pesoTargetKg;
  final String? motivazione;
  final String? regimeAlimentare;
  final List<String>? allergeni;
  final List<String>? intolleranze;
  final List<String>? cibiPreferiti;
  final List<String>? cibiEvitati;
  final int? nPastiDie;
  final List<String>? orariPasti;
  final int? occasioniSociali;
  final int? oreSonno;
  final int? livelloStress;
  final String? consumoAcquaLitri;
  final String? fumo;
  final List<Map<String, dynamic>>? integratori;
  final String? patologie;
  final String? farmaci;
  final String? noteLibere;

  Map<String, dynamic> toJson() => {
        'obiettivo': obiettivo,
        if (timeframeSettimane != null)
          'timeframe_settimane': timeframeSettimane,
        if (pesoTargetKg != null) 'peso_target_kg': pesoTargetKg,
        if (motivazione != null) 'motivazione': motivazione,
        if (regimeAlimentare != null) 'regime_alimentare': regimeAlimentare,
        if (allergeni != null) 'allergeni': allergeni,
        if (intolleranze != null) 'intolleranze': intolleranze,
        if (cibiPreferiti != null) 'cibi_preferiti': cibiPreferiti,
        if (cibiEvitati != null) 'cibi_evitati': cibiEvitati,
        if (nPastiDie != null) 'n_pasti_die': nPastiDie,
        if (orariPasti != null) 'orari_pasti': orariPasti,
        if (occasioniSociali != null) 'occasioni_sociali': occasioniSociali,
        if (oreSonno != null) 'ore_sonno': oreSonno,
        if (livelloStress != null) 'livello_stress': livelloStress,
        if (consumoAcquaLitri != null) 'consumo_acqua_litri': consumoAcquaLitri,
        if (fumo != null) 'fumo': fumo,
        if (integratori != null) 'integratori': integratori,
        if (patologie != null) 'patologie': patologie,
        if (farmaci != null) 'farmaci': farmaci,
        if (noteLibere != null) 'note_libere': noteLibere,
      };
}

class NutritionRequestRepository {
  NutritionRequestRepository(this._dio);
  final Dio _dio;

  Future<NutritionRequest?> getActive() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/api/v1/me/nutrition/requests/active',
      );
      final data = res.data!['data'] as Map<String, dynamic>;
      final raw = data['request'];
      if (raw == null) return null;
      return NutritionRequest.fromJson(raw as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<NutritionRequest> create(CreateNutritionRequestPayload payload) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/api/v1/me/nutrition/requests',
        data: payload.toJson(),
      );
      final data = res.data!['data'] as Map<String, dynamic>;
      return NutritionRequest.fromJson(
          data['request'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final nutritionRequestRepositoryProvider =
    Provider<NutritionRequestRepository>((ref) {
  return NutritionRequestRepository(ref.watch(dioProvider));
});

final activeNutritionRequestProvider =
    FutureProvider<NutritionRequest?>((ref) async {
  return ref.watch(nutritionRequestRepositoryProvider).getActive();
});
