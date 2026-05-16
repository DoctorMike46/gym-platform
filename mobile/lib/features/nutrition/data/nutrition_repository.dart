import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';

/// Momenti del pasto, in ordine cronologico della giornata.
enum MealMoment {
  colazione,
  spuntinoMat,
  pranzo,
  spuntinoPom,
  cena,
  preNanna,
}

extension MealMomentX on MealMoment {
  String get apiValue {
    switch (this) {
      case MealMoment.colazione:
        return 'colazione';
      case MealMoment.spuntinoMat:
        return 'spuntino_mat';
      case MealMoment.pranzo:
        return 'pranzo';
      case MealMoment.spuntinoPom:
        return 'spuntino_pom';
      case MealMoment.cena:
        return 'cena';
      case MealMoment.preNanna:
        return 'pre_nanna';
    }
  }

  String get label {
    switch (this) {
      case MealMoment.colazione:
        return 'Colazione';
      case MealMoment.spuntinoMat:
        return 'Spuntino mattina';
      case MealMoment.pranzo:
        return 'Pranzo';
      case MealMoment.spuntinoPom:
        return 'Spuntino pomeriggio';
      case MealMoment.cena:
        return 'Cena';
      case MealMoment.preNanna:
        return 'Pre-nanna';
    }
  }

  static MealMoment? fromApi(String? v) {
    switch (v) {
      case 'colazione':
        return MealMoment.colazione;
      case 'spuntino_mat':
        return MealMoment.spuntinoMat;
      case 'pranzo':
        return MealMoment.pranzo;
      case 'spuntino_pom':
        return MealMoment.spuntinoPom;
      case 'cena':
        return MealMoment.cena;
      case 'pre_nanna':
        return MealMoment.preNanna;
      default:
        return null;
    }
  }
}

class MealItemAlternative {
  const MealItemAlternative({
    required this.alimento,
    required this.quantitaG,
    required this.kcal,
    required this.proteineG,
    required this.carboG,
    required this.grassiG,
    this.note,
  });

  final String alimento;
  final int quantitaG;
  final int kcal;
  final int proteineG;
  final int carboG;
  final int grassiG;
  final String? note;

  factory MealItemAlternative.fromJson(Map<String, dynamic> json) {
    return MealItemAlternative(
      alimento: json['alimento'] as String? ?? '',
      quantitaG: (json['quantita_g'] as num?)?.toInt() ?? 0,
      kcal: (json['kcal'] as num?)?.toInt() ?? 0,
      proteineG: (json['proteine_g'] as num?)?.toInt() ?? 0,
      carboG: (json['carbo_g'] as num?)?.toInt() ?? 0,
      grassiG: (json['grassi_g'] as num?)?.toInt() ?? 0,
      note: json['note'] as String?,
    );
  }
}

class MealItem {
  const MealItem({
    required this.alimento,
    required this.quantitaG,
    required this.kcal,
    required this.proteineG,
    required this.carboG,
    required this.grassiG,
    this.note,
    this.alternatives = const [],
  });

  final String alimento;
  final int quantitaG;
  final int kcal;
  final int proteineG;
  final int carboG;
  final int grassiG;
  final String? note;
  final List<MealItemAlternative> alternatives;

  factory MealItem.fromJson(Map<String, dynamic> json) {
    final altsRaw = json['alternatives'] as List<dynamic>?;
    return MealItem(
      alimento: json['alimento'] as String? ?? '',
      quantitaG: (json['quantita_g'] as num?)?.toInt() ?? 0,
      kcal: (json['kcal'] as num?)?.toInt() ?? 0,
      proteineG: (json['proteine_g'] as num?)?.toInt() ?? 0,
      carboG: (json['carbo_g'] as num?)?.toInt() ?? 0,
      grassiG: (json['grassi_g'] as num?)?.toInt() ?? 0,
      note: json['note'] as String?,
      alternatives: altsRaw == null
          ? const []
          : altsRaw
              .cast<Map<String, dynamic>>()
              .map(MealItemAlternative.fromJson)
              .toList(),
    );
  }
}

class Meal {
  const Meal({
    required this.id,
    required this.giornoSettimana,
    required this.momento,
    required this.ordine,
    required this.descrizione,
    this.kcal,
    this.proteine,
    this.carbo,
    this.grassi,
    this.note,
    this.items = const [],
  });

  final int id;
  final int giornoSettimana;
  final MealMoment momento;
  final int ordine;
  final String descrizione;
  final int? kcal;
  final int? proteine;
  final int? carbo;
  final int? grassi;
  final String? note;
  final List<MealItem> items;

  factory Meal.fromJson(Map<String, dynamic> json) {
    final itemsRaw = json['items'] as List<dynamic>?;
    return Meal(
      id: (json['id'] as num).toInt(),
      giornoSettimana: (json['giorno_settimana'] as num).toInt(),
      momento: MealMomentX.fromApi(json['momento'] as String?) ??
          MealMoment.colazione,
      ordine: (json['ordine'] as num?)?.toInt() ?? 0,
      descrizione: json['descrizione'] as String? ?? '',
      kcal: (json['kcal'] as num?)?.toInt(),
      proteine: (json['proteine_g'] as num?)?.toInt(),
      carbo: (json['carbo_g'] as num?)?.toInt(),
      grassi: (json['grassi_g'] as num?)?.toInt(),
      note: json['note'] as String?,
      items: itemsRaw == null
          ? const []
          : itemsRaw
              .cast<Map<String, dynamic>>()
              .map(MealItem.fromJson)
              .toList(),
    );
  }
}

class MealPlan {
  const MealPlan({
    required this.id,
    required this.nome,
    required this.dataInizio,
    this.dataFine,
    this.note,
    this.kcalTarget,
    this.proteineTarget,
    this.carboTarget,
    this.grassiTarget,
    required this.meals,
  });

  final int id;
  final String nome;
  final DateTime dataInizio;
  final DateTime? dataFine;
  final String? note;
  final int? kcalTarget;
  final int? proteineTarget;
  final int? carboTarget;
  final int? grassiTarget;
  final List<Meal> meals;

  /// Pasti raggruppati per giorno (1=Lun … 7=Dom) e ordinati per momento+ordine.
  Map<int, List<Meal>> get byDay {
    final map = <int, List<Meal>>{};
    for (final m in meals) {
      map.putIfAbsent(m.giornoSettimana, () => []).add(m);
    }
    for (final list in map.values) {
      list.sort((a, b) {
        final c = a.momento.index.compareTo(b.momento.index);
        return c != 0 ? c : a.ordine.compareTo(b.ordine);
      });
    }
    return map;
  }

  factory MealPlan.fromJson(Map<String, dynamic> json) {
    final mealsJson = (json['meals'] as List<dynamic>?) ?? const [];
    return MealPlan(
      id: (json['id'] as num).toInt(),
      nome: json['nome'] as String? ?? 'Piano alimentare',
      dataInizio: DateTime.parse(json['data_inizio'] as String),
      dataFine: (json['data_fine'] as String?) != null
          ? DateTime.parse(json['data_fine'] as String)
          : null,
      note: json['note'] as String?,
      kcalTarget: (json['kcal_target'] as num?)?.toInt(),
      proteineTarget: (json['proteine_g'] as num?)?.toInt(),
      carboTarget: (json['carbo_g'] as num?)?.toInt(),
      grassiTarget: (json['grassi_g'] as num?)?.toInt(),
      meals: mealsJson
          .cast<Map<String, dynamic>>()
          .map(Meal.fromJson)
          .toList(),
    );
  }
}

class NutritionRepository {
  NutritionRepository(this._dio);
  final Dio _dio;

  /// Ritorna il piano attivo del cliente loggato, o null se nessuno.
  Future<MealPlan?> getCurrent() async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        '/api/v1/me/nutrition/current',
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      final plan = data['plan'];
      if (plan == null) return null;
      return MealPlan.fromJson(plan as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final nutritionRepositoryProvider = Provider<NutritionRepository>((ref) {
  return NutritionRepository(ref.watch(dioProvider));
});

final currentMealPlanProvider = FutureProvider<MealPlan?>((ref) async {
  return ref.watch(nutritionRepositoryProvider).getCurrent();
});
