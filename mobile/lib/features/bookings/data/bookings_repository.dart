import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';

class AppointmentType {
  const AppointmentType({
    required this.id,
    required this.nome,
    this.descrizione,
    required this.durataMinuti,
    required this.coloreHex,
    this.prezzoCents,
    required this.modalita,
  });

  final int id;
  final String nome;
  final String? descrizione;
  final int durataMinuti;
  final String coloreHex;
  final int? prezzoCents;
  final String modalita; // 'online' | 'in_presenza' | 'entrambi'

  String? get prezzoFormatted {
    if (prezzoCents == null) return null;
    final euro = prezzoCents! / 100;
    return '€ ${euro.toStringAsFixed(2).replaceAll('.', ',')}';
  }

  factory AppointmentType.fromJson(Map<String, dynamic> json) {
    return AppointmentType(
      id: (json['id'] as num).toInt(),
      nome: json['nome'] as String,
      descrizione: json['descrizione'] as String?,
      durataMinuti: (json['durata_minuti'] as num).toInt(),
      coloreHex: json['colore_hex'] as String? ?? '#3b82f6',
      prezzoCents: (json['prezzo_centesimi'] as num?)?.toInt(),
      modalita: json['modalita'] as String? ?? 'in_presenza',
    );
  }
}

class BookingSlot {
  const BookingSlot({required this.start, required this.end});
  final DateTime start;
  final DateTime end;

  factory BookingSlot.fromJson(Map<String, dynamic> json) {
    return BookingSlot(
      start: DateTime.parse(json['start'] as String).toLocal(),
      end: DateTime.parse(json['end'] as String).toLocal(),
    );
  }
}

class AvailabilityDay {
  const AvailabilityDay({required this.date, required this.slots});
  final DateTime date; // solo data, mezzanotte locale
  final List<BookingSlot> slots;

  factory AvailabilityDay.fromJson(Map<String, dynamic> json) {
    return AvailabilityDay(
      date: DateTime.parse(json['date'] as String),
      slots: (json['slots'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(BookingSlot.fromJson)
          .toList(),
    );
  }
}

class Appointment {
  const Appointment({
    required this.id,
    required this.startAt,
    required this.endAt,
    required this.status,
    required this.modalita,
    this.clienteNote,
    this.trainerNote,
    this.cancelledReason,
    this.typeId,
    this.typeNome,
    this.typeDurata,
    this.typeColore,
  });

  final int id;
  final DateTime startAt;
  final DateTime endAt;
  final String status;
  final String modalita;
  final String? clienteNote;
  final String? trainerNote;
  final String? cancelledReason;
  final int? typeId;
  final String? typeNome;
  final int? typeDurata;
  final String? typeColore;

  bool get isPending => status == 'pending';
  bool get isConfirmed => status == 'confirmed';
  bool get isCancelled =>
      status == 'cancelled_client' || status == 'cancelled_trainer';

  factory Appointment.fromJson(Map<String, dynamic> json) {
    return Appointment(
      id: (json['id'] as num).toInt(),
      startAt: DateTime.parse(json['start_at'] as String).toLocal(),
      endAt: DateTime.parse(json['end_at'] as String).toLocal(),
      status: json['status'] as String? ?? 'pending',
      modalita: json['modalita'] as String? ?? 'in_presenza',
      clienteNote: json['cliente_note'] as String?,
      trainerNote: json['trainer_note'] as String?,
      cancelledReason: json['cancelled_reason'] as String?,
      typeId: (json['type_id'] as num?)?.toInt(),
      typeNome: json['type_nome'] as String?,
      typeDurata: (json['type_durata'] as num?)?.toInt(),
      typeColore: json['type_colore'] as String?,
    );
  }
}

class BookingsRepository {
  BookingsRepository(this._dio);
  final Dio _dio;

  Future<List<AppointmentType>> listTypes() async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        '/api/v1/me/appointment-types',
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['appointment_types'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(AppointmentType.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<List<AvailabilityDay>> getSlots({
    required DateTime from,
    required DateTime to,
    required int durationMin,
  }) async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        '/api/v1/me/availability/slots',
        queryParameters: {
          'from': _isoDate(from),
          'to': _isoDate(to),
          'duration_min': durationMin,
        },
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['days'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(AvailabilityDay.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<List<Appointment>> listAppointments({
    String timeframe = 'upcoming',
  }) async {
    try {
      final r = await _dio.get<Map<String, dynamic>>(
        '/api/v1/me/appointments',
        queryParameters: {'timeframe': timeframe},
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['appointments'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(Appointment.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<int> book({
    required int appointmentTypeId,
    required DateTime startAt,
    String? clienteNote,
    String? modalita,
  }) async {
    try {
      final r = await _dio.post<Map<String, dynamic>>(
        '/api/v1/me/appointments',
        data: {
          'appointment_type_id': appointmentTypeId,
          'start_at': startAt.toUtc().toIso8601String(),
          if (clienteNote != null && clienteNote.isNotEmpty)
            'cliente_note': clienteNote,
          // ignore: use_null_aware_elements
          if (modalita != null) 'modalita': modalita,
        },
      );
      final data = r.data!['data'] as Map<String, dynamic>;
      return (data['appointment_id'] as num).toInt();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> cancel(int appointmentId) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/v1/me/appointments/$appointmentId/cancel',
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  static String _isoDate(DateTime d) {
    final y = d.year.toString();
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }
}

final bookingsRepositoryProvider = Provider<BookingsRepository>((ref) {
  return BookingsRepository(ref.watch(dioProvider));
});

final appointmentTypesProvider = FutureProvider<List<AppointmentType>>((
  ref,
) async {
  return ref.watch(bookingsRepositoryProvider).listTypes();
});

/// Famiglia: lista prenotazioni per timeframe.
final myAppointmentsProvider = FutureProvider.family<List<Appointment>, String>((
  ref,
  timeframe,
) async {
  return ref.watch(bookingsRepositoryProvider).listAppointments(
    timeframe: timeframe,
  );
});
