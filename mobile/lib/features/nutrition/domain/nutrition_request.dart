enum NutritionRequestStatus { pending, inReview, approved, declined }

extension NutritionRequestStatusX on NutritionRequestStatus {
  String get apiValue {
    switch (this) {
      case NutritionRequestStatus.pending: return 'pending';
      case NutritionRequestStatus.inReview: return 'in_review';
      case NutritionRequestStatus.approved: return 'approved';
      case NutritionRequestStatus.declined: return 'declined';
    }
  }

  String get label {
    switch (this) {
      case NutritionRequestStatus.pending: return 'In attesa';
      case NutritionRequestStatus.inReview: return 'In revisione';
      case NutritionRequestStatus.approved: return 'Approvata';
      case NutritionRequestStatus.declined: return 'Rifiutata';
    }
  }

  static NutritionRequestStatus fromApi(String v) {
    switch (v) {
      case 'in_review': return NutritionRequestStatus.inReview;
      case 'approved': return NutritionRequestStatus.approved;
      case 'declined': return NutritionRequestStatus.declined;
      default: return NutritionRequestStatus.pending;
    }
  }
}

enum Obiettivo {
  dimagrimento,
  massa,
  mantenimento,
  performance,
  salute,
  ricomposizione,
}

extension ObiettivoX on Obiettivo {
  String get apiValue => name;
  String get label {
    switch (this) {
      case Obiettivo.dimagrimento: return 'Dimagrimento';
      case Obiettivo.massa: return 'Aumento massa';
      case Obiettivo.mantenimento: return 'Mantenimento';
      case Obiettivo.performance: return 'Performance';
      case Obiettivo.salute: return 'Salute';
      case Obiettivo.ricomposizione: return 'Ricomposizione';
    }
  }
}

class NutritionRequest {
  const NutritionRequest({
    required this.id,
    required this.status,
    required this.requestedAt,
    this.obiettivo,
    this.timeframeSettimane,
    this.declineReason,
    this.linkedMealPlanId,
    this.decidedAt,
  });

  final int id;
  final NutritionRequestStatus status;
  final DateTime requestedAt;
  final String? obiettivo;
  final int? timeframeSettimane;
  final String? declineReason;
  final int? linkedMealPlanId;
  final DateTime? decidedAt;

  factory NutritionRequest.fromJson(Map<String, dynamic> json) =>
      NutritionRequest(
        id: (json['id'] as num).toInt(),
        status: NutritionRequestStatusX.fromApi(
            json['status']?.toString() ?? 'pending'),
        requestedAt: DateTime.parse(json['requested_at'].toString()),
        obiettivo: json['obiettivo']?.toString(),
        timeframeSettimane: json['timeframe_settimane'] is num
            ? (json['timeframe_settimane'] as num).toInt()
            : null,
        declineReason: json['trainer_decline_reason']?.toString(),
        linkedMealPlanId: json['linked_meal_plan_id'] is num
            ? (json['linked_meal_plan_id'] as num).toInt()
            : null,
        decidedAt: json['decided_at'] != null
            ? DateTime.tryParse(json['decided_at'].toString())
            : null,
      );

  bool get isActive =>
      status == NutritionRequestStatus.pending ||
      status == NutritionRequestStatus.inReview;
}
