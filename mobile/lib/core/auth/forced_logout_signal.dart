import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Signal provider per forzare logout dall'auth interceptor senza ciclo
/// di import (dioProvider non può importare authControllerProvider direttamente).
///
/// L'auth interceptor incrementa questo contatore quando il refresh fallisce.
/// AuthController ascolta e transita a `unauthenticated`.
final forcedLogoutSignalProvider = StateProvider<int>((ref) => 0);
