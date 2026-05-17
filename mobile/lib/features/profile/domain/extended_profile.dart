// Modelli del profilo cliente esteso.
// Mirror del backend /api/v1/me/profile/extended.

class PhysicalData {
  const PhysicalData({
    this.peso,
    this.altezza,
    this.eta,
    this.dataDiNascita,
    this.sesso,
    this.livelloAttivita,
  });

  final String? peso;
  final String? altezza;
  final int? eta;
  final String? dataDiNascita;
  final String? sesso; // 'M' | 'F' | 'altro'
  final String? livelloAttivita; // 'sedentario'|'leggero'|'moderato'|'intenso'|'molto_intenso'

  factory PhysicalData.fromJson(Map<String, dynamic> json) => PhysicalData(
        peso: json['peso']?.toString(),
        altezza: json['altezza']?.toString(),
        eta: json['eta'] is num ? (json['eta'] as num).toInt() : null,
        dataDiNascita: json['data_di_nascita']?.toString(),
        sesso: json['sesso']?.toString(),
        livelloAttivita: json['livello_attivita']?.toString(),
      );

  bool get isComplete =>
      peso != null && altezza != null && sesso != null && livelloAttivita != null;
}

class GoalData {
  const GoalData({
    this.obiettivo,
    this.timeframeSettimane,
    this.pesoTargetKg,
    this.motivazione,
  });

  final String? obiettivo;
  final int? timeframeSettimane;
  final String? pesoTargetKg;
  final String? motivazione;

  factory GoalData.fromJson(Map<String, dynamic> json) => GoalData(
        obiettivo: json['obiettivo']?.toString(),
        timeframeSettimane: json['timeframe_settimane'] is num
            ? (json['timeframe_settimane'] as num).toInt()
            : null,
        pesoTargetKg: json['peso_target_kg']?.toString(),
        motivazione: json['motivazione']?.toString(),
      );

  bool get isComplete => obiettivo != null;
}

class NutritionPreferences {
  const NutritionPreferences({
    this.regimeAlimentare,
    this.allergeni,
    this.intolleranze,
    this.preferenzeAlimenti,
    this.esclusioniAlimenti,
    this.noteAggiuntive,
  });

  final String? regimeAlimentare;
  final List<String>? allergeni;
  final List<String>? intolleranze;
  final List<String>? preferenzeAlimenti;
  final List<String>? esclusioniAlimenti;
  final String? noteAggiuntive;

  static List<String>? _strList(dynamic v) {
    if (v == null) return null;
    if (v is List) return v.map((e) => e.toString()).toList();
    return null;
  }

  factory NutritionPreferences.fromJson(Map<String, dynamic> json) =>
      NutritionPreferences(
        regimeAlimentare: json['regime_alimentare']?.toString(),
        allergeni: _strList(json['allergeni']),
        intolleranze: _strList(json['intolleranze']),
        preferenzeAlimenti: _strList(json['preferenze_alimenti']),
        esclusioniAlimenti: _strList(json['esclusioni_alimenti']),
        noteAggiuntive: json['note_aggiuntive']?.toString(),
      );

  bool get isComplete => regimeAlimentare != null;
}

class Integratore {
  const Integratore({required this.nome, this.dosaggio});
  final String nome;
  final String? dosaggio;

  factory Integratore.fromJson(Map<String, dynamic> json) => Integratore(
        nome: json['nome']?.toString() ?? '',
        dosaggio: json['dosaggio']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'nome': nome,
        if (dosaggio != null) 'dosaggio': dosaggio,
      };
}

class LifestyleData {
  const LifestyleData({
    this.oreSonnoMedie,
    this.livelloStress,
    this.nPastiDie,
    this.orariPasti,
    this.occasioniSocialiSettimana,
    this.consumoAcquaLitri,
    this.fumo,
    this.integratori,
  });

  final int? oreSonnoMedie;
  final int? livelloStress;
  final int? nPastiDie;
  final List<String>? orariPasti;
  final int? occasioniSocialiSettimana;
  final String? consumoAcquaLitri;
  final String? fumo; // 'no'|'si'|'ex'
  final List<Integratore>? integratori;

  factory LifestyleData.fromJson(Map<String, dynamic> json) {
    final orariRaw = json['orari_pasti'];
    final integRaw = json['integratori'];
    return LifestyleData(
      oreSonnoMedie: json['ore_sonno_medie'] is num
          ? (json['ore_sonno_medie'] as num).toInt()
          : null,
      livelloStress: json['livello_stress'] is num
          ? (json['livello_stress'] as num).toInt()
          : null,
      nPastiDie: json['n_pasti_die'] is num ? (json['n_pasti_die'] as num).toInt() : null,
      orariPasti: orariRaw is List
          ? orariRaw.map((e) => e.toString()).toList()
          : null,
      occasioniSocialiSettimana: json['occasioni_sociali_settimana'] is num
          ? (json['occasioni_sociali_settimana'] as num).toInt()
          : null,
      consumoAcquaLitri: json['consumo_acqua_litri']?.toString(),
      fumo: json['fumo']?.toString(),
      integratori: integRaw is List
          ? integRaw
              .map((e) => Integratore.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
    );
  }

  bool get isComplete => oreSonnoMedie != null || nPastiDie != null;
}

class MedicalHistory {
  const MedicalHistory({
    this.patologie,
    this.farmaci,
    this.note,
    this.disclaimerAcceptedAt,
  });

  final String? patologie;
  final String? farmaci;
  final String? note;
  final DateTime? disclaimerAcceptedAt;

  factory MedicalHistory.fromJson(Map<String, dynamic> json) => MedicalHistory(
        patologie: json['patologie']?.toString(),
        farmaci: json['farmaci']?.toString(),
        note: json['note']?.toString(),
        disclaimerAcceptedAt: json['disclaimer_accepted_at'] != null
            ? DateTime.tryParse(json['disclaimer_accepted_at'].toString())
            : null,
      );

  bool get hasAcceptedDisclaimer => disclaimerAcceptedAt != null;
  bool get hasContent => patologie != null || farmaci != null || note != null;
}

class ExtendedProfile {
  const ExtendedProfile({
    required this.id,
    required this.nome,
    required this.cognome,
    required this.email,
    this.telefono,
    required this.anamnesiStatus,
    this.healthDataConsentAt,
    required this.physical,
    required this.goals,
    required this.nutritionPreferences,
    required this.lifestyle,
    required this.medicalHistory,
    required this.injuries,
    this.activeNutritionRequest,
  });

  final int id;
  final String nome;
  final String cognome;
  final String email;
  final String? telefono;
  final String anamnesiStatus;
  final DateTime? healthDataConsentAt;
  final PhysicalData physical;
  final GoalData goals;
  final NutritionPreferences nutritionPreferences;
  final LifestyleData lifestyle;
  final MedicalHistory medicalHistory;
  final List<dynamic> injuries; // ClientInjury[] — tipizzato in injuries_repository
  final Map<String, dynamic>? activeNutritionRequest;

  factory ExtendedProfile.fromJson(Map<String, dynamic> json) {
    final injRaw = json['injuries'];
    return ExtendedProfile(
      id: (json['id'] as num).toInt(),
      nome: json['nome']?.toString() ?? '',
      cognome: json['cognome']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      telefono: json['telefono']?.toString(),
      anamnesiStatus: json['anamnesi_status']?.toString() ?? 'non firmato',
      healthDataConsentAt: json['health_data_consent_at'] != null
          ? DateTime.tryParse(json['health_data_consent_at'].toString())
          : null,
      physical: PhysicalData.fromJson(
          json['physical'] as Map<String, dynamic>? ?? {}),
      goals: GoalData.fromJson(json['goals'] as Map<String, dynamic>? ?? {}),
      nutritionPreferences: NutritionPreferences.fromJson(
          json['nutrition_preferences'] as Map<String, dynamic>? ?? {}),
      lifestyle: LifestyleData.fromJson(
          json['lifestyle'] as Map<String, dynamic>? ?? {}),
      medicalHistory: MedicalHistory.fromJson(
          json['medical_history'] as Map<String, dynamic>? ?? {}),
      injuries: injRaw is List ? injRaw : <dynamic>[],
      activeNutritionRequest:
          json['active_nutrition_request'] as Map<String, dynamic>?,
    );
  }

  String get fullName => '$nome $cognome'.trim();
}
