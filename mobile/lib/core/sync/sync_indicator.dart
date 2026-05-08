import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import 'pending_mutation_store.dart';
import 'sync_worker.dart';

/// Banner sottile sopra il bottom nav che mostra:
/// - "X modifiche in coda" se ci sono pending mutations
/// - "Offline" se la connettività è assente
/// - sparisce quando online + zero pending
class SyncIndicator extends ConsumerWidget {
  const SyncIndicator({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pending = ref.watch(pendingMutationsCountProvider).valueOrNull ?? 0;
    final online = ref.watch(isOnlineProvider).valueOrNull ?? true;

    if (pending == 0 && online) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final isOffline = !online;
    final color = isOffline ? AppColors.danger : AppColors.warning;
    final icon = isOffline ? Icons.cloud_off_rounded : Icons.sync_rounded;
    final text = isOffline
        ? (pending > 0
            ? 'Offline · $pending in coda'
            : 'Offline')
        : '$pending ${pending == 1 ? "modifica" : "modifiche"} in sync…';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      color: color.withValues(alpha: 0.12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (!isOffline)
            SizedBox(
              width: 12,
              height: 12,
              child: CircularProgressIndicator(strokeWidth: 1.6, color: color),
            )
          else
            Icon(icon, size: 14, color: color),
          const SizedBox(width: 8),
          Text(
            text,
            style: theme.textTheme.bodySmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(width: 12),
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadius.pill),
              onTap: () => ref.read(syncWorkerProvider).flush(),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text(
                  'RIPROVA',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: color,
                    letterSpacing: 0.6,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms).slideY(begin: 1, end: 0);
  }
}
