import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';

class GdprConsents {
  const GdprConsents({
    this.privacyAcceptedAt,
    this.termsAcceptedAt,
    this.healthDataConsentAt,
    this.marketingConsentAt,
  });

  final DateTime? privacyAcceptedAt;
  final DateTime? termsAcceptedAt;
  final DateTime? healthDataConsentAt;
  final DateTime? marketingConsentAt;

  bool get marketingEnabled => marketingConsentAt != null;

  factory GdprConsents.fromJson(Map<String, dynamic> json) {
    DateTime? parse(String? raw) =>
        raw == null ? null : DateTime.parse(raw).toLocal();
    return GdprConsents(
      privacyAcceptedAt: parse(json['privacy_accepted_at'] as String?),
      termsAcceptedAt: parse(json['terms_accepted_at'] as String?),
      healthDataConsentAt: parse(json['health_data_consent_at'] as String?),
      marketingConsentAt: parse(json['marketing_consent_at'] as String?),
    );
  }
}

class AccountGdprRepository {
  AccountGdprRepository(this._dio);
  final Dio _dio;

  Future<GdprConsents> getConsents() async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        '/api/v1/me/account/consents',
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      final c = data['consents'] as Map<String, dynamic>;
      return GdprConsents.fromJson(c);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<GdprConsents> setMarketing(bool enabled) async {
    try {
      final r = await _dio.patch<Map<String, dynamic>>(
        '/api/v1/me/account/consents',
        data: {'marketing': enabled},
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      final c = data['consents'] as Map<String, dynamic>;
      return GdprConsents.fromJson(c);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Scarica l'export completo come stringa JSON formattata.
  Future<String> exportData() async {
    try {
      final r = await _dio.get<dynamic>(
        '/api/v1/me/account/export',
        options: Options(responseType: ResponseType.plain),
      );
      // Already pretty-printed by server; ritorna grezzo.
      final raw = r.data;
      if (raw is String) return raw;
      return const JsonEncoder.withIndent('  ').convert(raw);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Cancella definitivamente l'account dell'utente.
  Future<void> deleteAccount({required String password}) async {
    try {
      await _dio.delete<Map<String, dynamic>>(
        '/api/v1/me/account',
        data: {'password': password, 'confirm': 'ELIMINA'},
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final accountGdprRepositoryProvider = Provider<AccountGdprRepository>((ref) {
  return AccountGdprRepository(ref.watch(dioProvider));
});

final consentsProvider = FutureProvider<GdprConsents>((ref) async {
  return ref.watch(accountGdprRepositoryProvider).getConsents();
});
