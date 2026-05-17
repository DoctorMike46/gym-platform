enum BodyPart {
  spallaSx,
  spallaDx,
  gomitoSx,
  gomitoDx,
  polsoSx,
  polsoDx,
  mano,
  schienaLombare,
  schienaDorsale,
  schienaCervicale,
  collo,
  ancaSx,
  ancaDx,
  ginocchioSx,
  ginocchioDx,
  cavigliaSx,
  cavigliaDx,
  piede,
  altro,
}

extension BodyPartX on BodyPart {
  String get apiValue {
    switch (this) {
      case BodyPart.spallaSx: return 'spalla_sx';
      case BodyPart.spallaDx: return 'spalla_dx';
      case BodyPart.gomitoSx: return 'gomito_sx';
      case BodyPart.gomitoDx: return 'gomito_dx';
      case BodyPart.polsoSx: return 'polso_sx';
      case BodyPart.polsoDx: return 'polso_dx';
      case BodyPart.mano: return 'mano';
      case BodyPart.schienaLombare: return 'schiena_lombare';
      case BodyPart.schienaDorsale: return 'schiena_dorsale';
      case BodyPart.schienaCervicale: return 'schiena_cervicale';
      case BodyPart.collo: return 'collo';
      case BodyPart.ancaSx: return 'anca_sx';
      case BodyPart.ancaDx: return 'anca_dx';
      case BodyPart.ginocchioSx: return 'ginocchio_sx';
      case BodyPart.ginocchioDx: return 'ginocchio_dx';
      case BodyPart.cavigliaSx: return 'caviglia_sx';
      case BodyPart.cavigliaDx: return 'caviglia_dx';
      case BodyPart.piede: return 'piede';
      case BodyPart.altro: return 'altro';
    }
  }

  String get label {
    switch (this) {
      case BodyPart.spallaSx: return 'Spalla sinistra';
      case BodyPart.spallaDx: return 'Spalla destra';
      case BodyPart.gomitoSx: return 'Gomito sinistro';
      case BodyPart.gomitoDx: return 'Gomito destro';
      case BodyPart.polsoSx: return 'Polso sinistro';
      case BodyPart.polsoDx: return 'Polso destro';
      case BodyPart.mano: return 'Mano';
      case BodyPart.schienaLombare: return 'Schiena lombare';
      case BodyPart.schienaDorsale: return 'Schiena dorsale';
      case BodyPart.schienaCervicale: return 'Cervicale';
      case BodyPart.collo: return 'Collo';
      case BodyPart.ancaSx: return 'Anca sinistra';
      case BodyPart.ancaDx: return 'Anca destra';
      case BodyPart.ginocchioSx: return 'Ginocchio sinistro';
      case BodyPart.ginocchioDx: return 'Ginocchio destro';
      case BodyPart.cavigliaSx: return 'Caviglia sinistra';
      case BodyPart.cavigliaDx: return 'Caviglia destra';
      case BodyPart.piede: return 'Piede';
      case BodyPart.altro: return 'Altro';
    }
  }

  static BodyPart? fromApi(String? v) {
    if (v == null) return null;
    for (final p in BodyPart.values) {
      if (p.apiValue == v) return p;
    }
    return null;
  }
}

enum InjuryType { muscolare, articolare, tendine, osseo, altro }
extension InjuryTypeX on InjuryType {
  String get apiValue => name;
  String get label {
    switch (this) {
      case InjuryType.muscolare: return 'Muscolare';
      case InjuryType.articolare: return 'Articolare';
      case InjuryType.tendine: return 'Tendine';
      case InjuryType.osseo: return 'Osseo';
      case InjuryType.altro: return 'Altro';
    }
  }
  static InjuryType? fromApi(String? v) {
    if (v == null) return null;
    for (final t in InjuryType.values) {
      if (t.apiValue == v) return t;
    }
    return null;
  }
}

enum InjuryGravita { leggera, media, grave }
extension InjuryGravitaX on InjuryGravita {
  String get apiValue => name;
  String get label {
    switch (this) {
      case InjuryGravita.leggera: return 'Leggera';
      case InjuryGravita.media: return 'Media';
      case InjuryGravita.grave: return 'Grave';
    }
  }
  static InjuryGravita fromApi(String v) {
    for (final g in InjuryGravita.values) {
      if (g.apiValue == v) return g;
    }
    return InjuryGravita.leggera;
  }
}

enum InjuryStato { attivo, recuperato }
extension InjuryStatoX on InjuryStato {
  String get apiValue => name;
  String get label => name[0].toUpperCase() + name.substring(1);
  static InjuryStato fromApi(String v) =>
      v == 'recuperato' ? InjuryStato.recuperato : InjuryStato.attivo;
}

class ClientInjury {
  const ClientInjury({
    required this.id,
    required this.parteCorpo,
    this.tipo,
    required this.gravita,
    required this.stato,
    this.dataEvento,
    this.dataRecupero,
    this.note,
  });

  final int id;
  final BodyPart parteCorpo;
  final InjuryType? tipo;
  final InjuryGravita gravita;
  final InjuryStato stato;
  final String? dataEvento;
  final String? dataRecupero;
  final String? note;

  factory ClientInjury.fromJson(Map<String, dynamic> json) => ClientInjury(
        id: (json['id'] as num).toInt(),
        parteCorpo: BodyPartX.fromApi(json['parte_corpo']?.toString()) ?? BodyPart.altro,
        tipo: InjuryTypeX.fromApi(json['tipo']?.toString()),
        gravita: InjuryGravitaX.fromApi(
            (json['gravita']?.toString()) ?? 'leggera'),
        stato: InjuryStatoX.fromApi(
            (json['stato']?.toString()) ?? 'attivo'),
        dataEvento: json['data_evento']?.toString(),
        dataRecupero: json['data_recupero']?.toString(),
        note: json['note']?.toString(),
      );

  bool get isActive => stato == InjuryStato.attivo;
}
