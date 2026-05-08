/// Identity minima del cliente, derivata dal payload del JWT / response login.
class ClientUser {
  const ClientUser({
    required this.id,
    required this.trainerId,
    required this.email,
  });

  final int id;
  final int trainerId;
  final String email;

  factory ClientUser.fromJson(Map<String, dynamic> json) {
    return ClientUser(
      id: (json['id'] as num).toInt(),
      trainerId: (json['trainer_id'] as num).toInt(),
      email: json['email'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'trainer_id': trainerId,
        'email': email,
      };
}

class TrainerBranding {
  const TrainerBranding({
    required this.siteName,
    this.logoUrl,
    required this.primaryColor,
    this.secondaryColor,
  });

  final String siteName;
  final String? logoUrl;
  final String primaryColor;
  final String? secondaryColor;

  factory TrainerBranding.fromJson(Map<String, dynamic> json) {
    return TrainerBranding(
      siteName: json['site_name']?.toString() ?? 'Gym Platform',
      logoUrl: json['logo_url']?.toString(),
      primaryColor: json['primary_color']?.toString() ?? '#003366',
      secondaryColor: json['secondary_color']?.toString(),
    );
  }
}

class ClientProfile {
  const ClientProfile({
    required this.id,
    required this.nome,
    required this.cognome,
    required this.email,
    this.telefono,
    this.peso,
    this.altezza,
    this.eta,
  });

  final int id;
  final String nome;
  final String cognome;
  final String email;
  final String? telefono;
  final String? peso;
  final String? altezza;
  final int? eta;

  String get fullName => '$nome $cognome'.trim();

  factory ClientProfile.fromJson(Map<String, dynamic> json) {
    return ClientProfile(
      id: (json['id'] as num).toInt(),
      nome: json['nome']?.toString() ?? '',
      cognome: json['cognome']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      telefono: json['telefono']?.toString(),
      peso: json['peso']?.toString(),
      altezza: json['altezza']?.toString(),
      eta: json['eta'] is num ? (json['eta'] as num).toInt() : null,
    );
  }
}
