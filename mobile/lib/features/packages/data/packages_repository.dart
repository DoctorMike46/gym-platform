import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';

class Package {
  const Package({
    required this.id,
    required this.nomeServizio,
    required this.categoria,
    required this.prezzoCents,
    this.descrizioneBreve,
    required this.caratteristiche,
    this.durataSettimane,
    required this.includeCoaching,
  });

  final int id;
  final String nomeServizio;
  final String categoria;
  final int prezzoCents;
  final String? descrizioneBreve;
  final List<String> caratteristiche;
  final int? durataSettimane;
  final bool includeCoaching;

  String get prezzoFormatted {
    final euro = prezzoCents ~/ 100;
    final cents = (prezzoCents % 100).toString().padLeft(2, '0');
    return '€ $euro,$cents';
  }

  factory Package.fromJson(Map<String, dynamic> json) {
    return Package(
      id: (json['id'] as num).toInt(),
      nomeServizio: json['nome_servizio'] as String,
      categoria: json['categoria'] as String? ?? 'Generale',
      prezzoCents: (json['prezzo'] as num).toInt(),
      descrizioneBreve: json['descrizione_breve'] as String?,
      caratteristiche: ((json['caratteristiche'] as List<dynamic>?) ?? const [])
          .map((e) => e.toString())
          .toList(),
      durataSettimane: (json['durata_settimane'] as num?)?.toInt(),
      includeCoaching: json['include_coaching'] as bool? ?? false,
    );
  }
}

class PackagesRepository {
  PackagesRepository(this._dio);
  final Dio _dio;

  Future<List<Package>> list() async {
    try {
      final r = await _dio.get<Map<String, dynamic>>('/api/v1/services');
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['services'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(Package.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final packagesRepositoryProvider = Provider<PackagesRepository>((ref) {
  return PackagesRepository(ref.watch(dioProvider));
});

final packagesListProvider = FutureProvider<List<Package>>((ref) async {
  return ref.watch(packagesRepositoryProvider).list();
});
