import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../domain/client_injury.dart';

class InjuriesRepository {
  InjuriesRepository(this._dio);
  final Dio _dio;

  Future<List<ClientInjury>> list({bool onlyActive = false}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/api/v1/me/injuries',
        queryParameters: {if (onlyActive) 'only_active': '1'},
      );
      final data = res.data!['data'] as Map<String, dynamic>;
      final list = (data['injuries'] as List<dynamic>?) ?? [];
      return list
          .map((e) => ClientInjury.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<ClientInjury> create({
    required BodyPart parteCorpo,
    InjuryType? tipo,
    required InjuryGravita gravita,
    String? dataEvento,
    String? note,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/api/v1/me/injuries',
        data: {
          'parte_corpo': parteCorpo.apiValue,
          if (tipo != null) 'tipo': tipo.apiValue,
          'gravita': gravita.apiValue,
          if (dataEvento != null) 'data_evento': dataEvento,
          if (note != null) 'note': note,
        },
      );
      final data = res.data!['data'] as Map<String, dynamic>;
      return ClientInjury.fromJson(data['injury'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<ClientInjury> update(
    int id, {
    BodyPart? parteCorpo,
    InjuryType? tipo,
    InjuryGravita? gravita,
    InjuryStato? stato,
    String? dataEvento,
    String? dataRecupero,
    String? note,
  }) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>(
        '/api/v1/me/injuries/$id',
        data: {
          if (parteCorpo != null) 'parte_corpo': parteCorpo.apiValue,
          if (tipo != null) 'tipo': tipo.apiValue,
          if (gravita != null) 'gravita': gravita.apiValue,
          if (stato != null) 'stato': stato.apiValue,
          if (dataEvento != null) 'data_evento': dataEvento,
          if (dataRecupero != null) 'data_recupero': dataRecupero,
          if (note != null) 'note': note,
        },
      );
      final data = res.data!['data'] as Map<String, dynamic>;
      return ClientInjury.fromJson(data['injury'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> delete(int id) async {
    try {
      await _dio.delete<Map<String, dynamic>>('/api/v1/me/injuries/$id');
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final injuriesRepositoryProvider = Provider<InjuriesRepository>((ref) {
  return InjuriesRepository(ref.watch(dioProvider));
});

final injuriesProvider = FutureProvider<List<ClientInjury>>((ref) async {
  return ref.watch(injuriesRepositoryProvider).list();
});
