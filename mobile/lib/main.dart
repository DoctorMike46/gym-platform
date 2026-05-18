import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app/app.dart';
import 'core/sync/pending_mutation_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Blocca l'app in modalità verticale (no rotazione paesaggio).
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  await Hive.initFlutter();
  final pendingStore = await PendingMutationStore.open();

  runApp(
    ProviderScope(
      overrides: [
        pendingMutationStoreProvider.overrideWithValue(pendingStore),
      ],
      child: const GymPlatformApp(),
    ),
  );
}
