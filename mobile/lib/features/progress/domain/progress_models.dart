// Modelli del dominio progressi.

class BodyMeasurement {
  const BodyMeasurement({
    required this.id,
    required this.clientId,
    required this.date,
    this.pesoKg,
    this.bodyFatPct,
    this.vitaCm,
    this.fianchiCm,
    this.pettoCm,
    this.braccioCm,
    this.cosciaCm,
    this.note,
  });

  final int id;
  final int clientId;
  final DateTime date;
  final double? pesoKg;
  final double? bodyFatPct;
  final double? vitaCm;
  final double? fianchiCm;
  final double? pettoCm;
  final double? braccioCm;
  final double? cosciaCm;
  final String? note;

  factory BodyMeasurement.fromJson(Map<String, dynamic> json) {
    double? parseDouble(dynamic v) {
      if (v == null) return null;
      if (v is num) return v.toDouble();
      if (v is String) return double.tryParse(v.replaceAll(',', '.'));
      return null;
    }

    return BodyMeasurement(
      id: (json['id'] as num).toInt(),
      clientId: (json['client_id'] as num).toInt(),
      date: DateTime.parse(json['date'] as String),
      pesoKg: parseDouble(json['peso_kg']),
      bodyFatPct: parseDouble(json['body_fat_pct']),
      vitaCm: parseDouble(json['vita_cm']),
      fianchiCm: parseDouble(json['fianchi_cm']),
      pettoCm: parseDouble(json['petto_cm']),
      braccioCm: parseDouble(json['braccio_cm']),
      cosciaCm: parseDouble(json['coscia_cm']),
      note: json['note'] as String?,
    );
  }
}

enum ProgressPhotoType {
  front,
  side,
  back;

  String get apiValue => name;

  String get label {
    switch (this) {
      case ProgressPhotoType.front:
        return 'Frontale';
      case ProgressPhotoType.side:
        return 'Laterale';
      case ProgressPhotoType.back:
        return 'Posteriore';
    }
  }

  static ProgressPhotoType? tryParse(String? s) {
    switch (s) {
      case 'front':
        return ProgressPhotoType.front;
      case 'side':
        return ProgressPhotoType.side;
      case 'back':
        return ProgressPhotoType.back;
      default:
        return null;
    }
  }
}

class ProgressPhoto {
  const ProgressPhoto({
    required this.id,
    required this.clientId,
    required this.date,
    required this.r2Key,
    required this.type,
    this.note,
  });

  final int id;
  final int clientId;
  final DateTime date;
  final String r2Key;
  final ProgressPhotoType type;
  final String? note;

  factory ProgressPhoto.fromJson(Map<String, dynamic> json) {
    return ProgressPhoto(
      id: (json['id'] as num).toInt(),
      clientId: (json['client_id'] as num).toInt(),
      date: DateTime.parse(json['date'] as String),
      r2Key: json['r2_key'] as String,
      type: ProgressPhotoType.tryParse(json['type'] as String?) ??
          ProgressPhotoType.front,
      note: json['note'] as String?,
    );
  }
}

class PresignUploadResponse {
  const PresignUploadResponse({
    required this.uploadUrl,
    required this.r2Key,
    required this.method,
    required this.headers,
    required this.expiresIn,
  });

  final String uploadUrl;
  final String r2Key;
  final String method;
  final Map<String, String> headers;
  final int expiresIn;

  factory PresignUploadResponse.fromJson(Map<String, dynamic> json) {
    final h = (json['headers'] as Map<String, dynamic>?) ?? {};
    return PresignUploadResponse(
      uploadUrl: json['upload_url'] as String,
      r2Key: json['r2_key'] as String,
      method: json['method'] as String? ?? 'PUT',
      headers: h.map((k, v) => MapEntry(k, v.toString())),
      expiresIn: (json['expires_in'] as num?)?.toInt() ?? 600,
    );
  }
}
