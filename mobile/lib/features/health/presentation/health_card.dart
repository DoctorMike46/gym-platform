import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_radius.dart';
import '../data/health_repository.dart';

class HealthBiometricsCard extends ConsumerWidget {
  const HealthBiometricsCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final asyncSnap = ref.watch(healthSnapshotProvider);

    return asyncSnap.when(
      loading: () => _CardShell(child: _LoadingState(theme: theme)),
      error: (e, _) => const SizedBox.shrink(),
      data: (snap) {
        final latest = snap.latest;
        if (latest.isEmpty) {
          return _CardShell(
            child: _OnboardingState(
              onSync: () => _runSync(context, ref),
            ),
          );
        }
        return _CardShell(
          child: _DataState(
            latest: latest,
            onRefresh: () => _runSync(context, ref),
          ),
        );
      },
    );
  }

  Future<void> _runSync(BuildContext context, WidgetRef ref) async {
    final service = ref.read(healthSyncServiceProvider);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final granted = await service.requestAuthorization();
      if (!granted) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text(
                'Permesso rifiutato. Abilita dalle impostazioni di Salute.'),
          ),
        );
        return;
      }
      messenger.showSnackBar(
        const SnackBar(content: Text('Sincronizzazione in corso…')),
      );
      final n = await service.fetchAndSync(daysBack: 30);
      messenger.showSnackBar(
        SnackBar(content: Text('Sincronizzati $n nuovi dati')),
      );
      ref.invalidate(healthSnapshotProvider);
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text('Errore: $e')),
      );
    }
  }
}

class _CardShell extends StatelessWidget {
  const _CardShell({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: child,
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState({required this.theme});
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
        const SizedBox(width: 10),
        Text(
          'Carico dati biometrici…',
          style: theme.textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class _OnboardingState extends StatelessWidget {
  const _OnboardingState({required this.onSync});
  final VoidCallback onSync;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final platformLabel =
        Platform.isIOS ? 'Apple Salute' : 'Google Health Connect';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.favorite_rounded,
              color: theme.colorScheme.primary,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              'Dati biometrici',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          'Collega $platformLabel per sincronizzare peso, passi, battito e calorie. Il tuo trainer vedrà i progressi in tempo reale.',
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: onSync,
            icon: const Icon(Icons.sync_rounded, size: 18),
            label: const Text('Collega e sincronizza'),
          ),
        ),
      ],
    );
  }
}

class _DataState extends StatelessWidget {
  const _DataState({required this.latest, required this.onRefresh});
  final Map<String, HealthSample> latest;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tiles = <_MetricTileData>[
      if (latest[HealthSampleTypes.weight] != null)
        _MetricTileData(
          icon: Icons.monitor_weight_rounded,
          label: 'Peso',
          value: _formatWeight(latest[HealthSampleTypes.weight]!.value),
          subtitle: _ago(latest[HealthSampleTypes.weight]!.recordedAt),
          color: Colors.green,
        ),
      if (latest[HealthSampleTypes.steps] != null)
        _MetricTileData(
          icon: Icons.directions_walk_rounded,
          label: 'Passi',
          value: _formatInt(latest[HealthSampleTypes.steps]!.valueAsDouble),
          subtitle: _ago(latest[HealthSampleTypes.steps]!.recordedAt),
          color: Colors.blue,
        ),
      if (latest[HealthSampleTypes.heartRateResting] != null)
        _MetricTileData(
          icon: Icons.favorite_rounded,
          label: 'Battito a riposo',
          value:
              '${_formatInt(latest[HealthSampleTypes.heartRateResting]!.valueAsDouble)} bpm',
          subtitle:
              _ago(latest[HealthSampleTypes.heartRateResting]!.recordedAt),
          color: Colors.pink,
        ),
      if (latest[HealthSampleTypes.activeEnergy] != null)
        _MetricTileData(
          icon: Icons.local_fire_department_rounded,
          label: 'Calorie attive',
          value:
              '${_formatInt(latest[HealthSampleTypes.activeEnergy]!.valueAsDouble)} kcal',
          subtitle: _ago(latest[HealthSampleTypes.activeEnergy]!.recordedAt),
          color: Colors.orange,
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.favorite_rounded,
              color: theme.colorScheme.primary,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Dati biometrici',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            IconButton(
              tooltip: 'Sincronizza',
              icon: const Icon(Icons.sync_rounded, size: 20),
              visualDensity: VisualDensity.compact,
              onPressed: onRefresh,
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (tiles.isEmpty)
          Text(
            'Nessun dato sincronizzato di recente. Premi sync per aggiornare.',
            style: theme.textTheme.bodySmall,
          )
        else
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 2.2,
            children: [for (final t in tiles) _MetricTile(data: t)],
          ),
      ],
    );
  }

  String _formatWeight(String raw) {
    final n = double.tryParse(raw);
    if (n == null) return raw;
    return '${n.toStringAsFixed(1)} kg';
  }

  String _formatInt(double n) {
    return n.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]}.',
        );
  }

  String _ago(DateTime ts) {
    final diff = DateTime.now().difference(ts);
    if (diff.inMinutes < 1) return 'ora';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m fa';
    if (diff.inHours < 24) return '${diff.inHours}h fa';
    if (diff.inDays < 7) return '${diff.inDays}g fa';
    return '${ts.day}/${ts.month}';
  }
}

class _MetricTileData {
  const _MetricTileData({
    required this.icon,
    required this.label,
    required this.value,
    required this.subtitle,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final String subtitle;
  final Color color;
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.data});
  final _MetricTileData data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: data.color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: data.color.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(data.icon, size: 14, color: data.color),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  data.label,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: data.color,
                    letterSpacing: 0.3,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            data.value,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            data.subtitle,
            style: theme.textTheme.bodySmall?.copyWith(
              fontSize: 10,
              color: theme.textTheme.bodySmall?.color?.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }
}
