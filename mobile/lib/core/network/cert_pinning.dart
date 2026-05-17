import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/foundation.dart';

import '../config/env.dart';

/// SHA-256 (base64) del certificato leaf (DER) atteso dal backend Vercel.
/// Aggiungere qui un nuovo pin **prima** di ogni rotazione cert (~ogni 60-90gg
/// su Vercel). Mantenere il vecchio pin per ~7 giorni di overlap dopo il
/// rinnovo, poi rimuoverlo.
///
/// Per estrarre il fingerprint corrente:
///   openssl s_client -connect gym-platform-seven.vercel.app:443 \
///     -servername gym-platform-seven.vercel.app < /dev/null 2>/dev/null \
///     | openssl x509 -outform DER \
///     | openssl dgst -sha256 -binary \
///     | openssl enc -base64
const List<String> kAllowedCertFingerprints = <String>[
  '+DLfsmU3YeiwAB26+E6rIGZ8m/sFIHAFR9Ozv1SBQ6o=', // *.vercel.app — valid 2026-04-28 → 2026-07-27 (GTS WR1)
];

/// Host considerati "locali" — il pinning è disattivato (utile per dev / emulator).
bool _isLocalHost(String host) {
  if (host == 'localhost' || host == '127.0.0.1' || host == '::1') return true;
  // Emulatore Android: 10.0.2.2 punta al loopback del Mac
  if (host == '10.0.2.2') return true;
  // IP privati comuni in LAN dev
  if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
    return true;
  }
  return false;
}

/// Installa il certificate pinning sul Dio fornito.
///
/// Strategia:
///   - In **prod**: strict mode → cert non-matching → connection rifiutata
///   - In **dev / debug**: soft mode → log warn, lascia passare la richiesta
///   - Host **locali**: pinning sempre skippato
///
/// Il `SecurityContext(withTrustedRoots: false)` invalida la verifica di
/// sistema così che TUTTI i cert finiscono in `badCertificateCallback`,
/// dove facciamo il vero check SHA-256.
void installCertPinning(Dio dio) {
  final strict = Env.isProd && !kDebugMode;

  final adapter = IOHttpClientAdapter();
  adapter.createHttpClient = () {
    final ctx = SecurityContext(withTrustedRoots: false);
    final client = HttpClient(context: ctx);

    client.badCertificateCallback = (X509Certificate cert, String host, int port) {
      if (_isLocalHost(host)) return true;

      final fp = base64Encode(sha256.convert(cert.der).bytes);
      if (kAllowedCertFingerprints.contains(fp)) return true;

      if (strict) {
        debugPrint('[cert-pinning] BLOCK $host:$port — unexpected cert sha256=$fp');
        return false;
      }
      debugPrint('[cert-pinning] WARN  $host:$port — unexpected cert sha256=$fp (non-strict, pass)');
      return true;
    };

    return client;
  };

  dio.httpClientAdapter = adapter;
}
