import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';

class ServiceSnapshot {
  const ServiceSnapshot({
    required this.nomeServizio,
    required this.categoria,
    required this.prezzoCents,
    this.durataSettimane,
  });

  final String nomeServizio;
  final String categoria;
  final int prezzoCents;
  final int? durataSettimane;

  String get prezzoFormatted {
    final euro = prezzoCents ~/ 100;
    final cents = (prezzoCents % 100).toString().padLeft(2, '0');
    return '€ $euro,$cents';
  }

  factory ServiceSnapshot.fromJson(Map<String, dynamic> json) {
    return ServiceSnapshot(
      nomeServizio: json['nome_servizio'] as String,
      categoria: json['categoria'] as String? ?? 'Generale',
      prezzoCents: (json['prezzo'] as num).toInt(),
      durataSettimane: (json['durata_settimane'] as num?)?.toInt(),
    );
  }
}

class Subscription {
  const Subscription({
    required this.id,
    required this.serviceId,
    required this.dataInizio,
    this.dataFine,
    required this.status,
    this.service,
  });

  final int id;
  final int serviceId;
  final DateTime dataInizio;
  final DateTime? dataFine;
  final String status; // 'attivo' | 'scaduto'
  final ServiceSnapshot? service;

  bool get isActive => status == 'attivo' && !_dateExpired;
  bool get isExpired => status != 'attivo' || _dateExpired;

  bool get _dateExpired {
    final end = dataFine;
    if (end == null) return false;
    return end.isBefore(DateTime.now());
  }

  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      id: (json['id'] as num).toInt(),
      serviceId: (json['service_id'] as num).toInt(),
      dataInizio: DateTime.parse(json['data_inizio'] as String),
      dataFine: (json['data_fine'] as String?) != null
          ? DateTime.parse(json['data_fine'] as String)
          : null,
      status: json['status'] as String? ?? 'attivo',
      service: (json['service'] as Map<String, dynamic>?) != null
          ? ServiceSnapshot.fromJson(json['service'] as Map<String, dynamic>)
          : null,
    );
  }
}

class SubscriptionsRepository {
  SubscriptionsRepository(this._dio);
  final Dio _dio;

  Future<List<Subscription>> list() async {
    try {
      final r =
          await _dio.get<Map<String, dynamic>>('/api/v1/me/subscriptions');
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['subscriptions'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(Subscription.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final subscriptionsRepositoryProvider =
    Provider<SubscriptionsRepository>((ref) {
  return SubscriptionsRepository(ref.watch(dioProvider));
});

final subscriptionsListProvider =
    FutureProvider<List<Subscription>>((ref) async {
  return ref.watch(subscriptionsRepositoryProvider).list();
});
