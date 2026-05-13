import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/top_bar_actions.dart';
import '../../../shared/utils/date_format_it.dart';
import '../data/progress_repository.dart';
import '../domain/progress_models.dart';
import 'photos_tab.dart';

class ProgressPage extends StatefulWidget {
  const ProgressPage({super.key});

  @override
  State<ProgressPage> createState() => _ProgressPageState();
}

class _ProgressPageState extends State<ProgressPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController = TabController(length: 2, vsync: this);

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Progressi'),
        actions: const [TopBarActions()],
        bottom: TabBar(
          controller: _tabController,
          labelColor: theme.colorScheme.primary,
          unselectedLabelColor: theme.textTheme.bodySmall?.color,
          indicatorColor: theme.colorScheme.primary,
          indicatorSize: TabBarIndicatorSize.label,
          labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          tabs: const [
            Tab(text: 'Misure'),
            Tab(text: 'Foto'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          MeasurementsTab(),
          PhotosTab(),
        ],
      ),
    );
  }
}

// ───────────────────────────── Misure ─────────────────────────────

class MeasurementsTab extends ConsumerWidget {
  const MeasurementsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncList = ref.watch(measurementsProvider);

    return Stack(
      children: [
        RefreshIndicator(
          onRefresh: () async => ref.invalidate(measurementsProvider),
          child: asyncList.when(
            loading: () => const _LoadingState(),
            error: (e, _) => _ErrorState(
              message: e is ApiException ? e.message : 'Errore caricamento',
              onRetry: () => ref.invalidate(measurementsProvider),
            ),
            data: (items) {
              if (items.isEmpty) {
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [_EmptyMeasurementsState()],
                );
              }
              final sorted = [...items]..sort((a, b) => a.date.compareTo(b.date));
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                children: [
                  _WeightChartCard(measurements: sorted),
                  const SizedBox(height: 16),
                  const _TrainingStatsCards(),
                  const SizedBox(height: 4),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(4, 12, 4, 8),
                    child: Text(
                      'Storico',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: Theme.of(context).textTheme.bodySmall?.color,
                            letterSpacing: 0.6,
                          ),
                    ),
                  ),
                  for (var i = sorted.length - 1; i >= 0; i--)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _MeasurementRow(measurement: sorted[i]),
                    ),
                ],
              );
            },
          ),
        ),
        Positioned(
          right: 16,
          bottom: 16 + MediaQuery.of(context).padding.bottom,
          child: FloatingActionButton.extended(
            heroTag: 'add-measurement',
            onPressed: () async {
              final added = await showModalBottomSheet<bool>(
                context: context,
                isScrollControlled: true,
                backgroundColor: Theme.of(context).colorScheme.surface,
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                ),
                builder: (_) => const _AddMeasurementSheet(),
              );
              if (added == true) {
                ref.invalidate(measurementsProvider);
              }
            },
            icon: const Icon(Icons.add_rounded),
            label: const Text('Nuova misura'),
          ),
        ),
      ],
    );
  }
}

class _WeightChartCard extends StatelessWidget {
  const _WeightChartCard({required this.measurements});
  final List<BodyMeasurement> measurements;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pointsKg = <FlSpot>[];
    final pointsBf = <FlSpot>[];
    for (var i = 0; i < measurements.length; i++) {
      final m = measurements[i];
      if (m.pesoKg != null) pointsKg.add(FlSpot(i.toDouble(), m.pesoKg!));
      if (m.bodyFatPct != null) pointsBf.add(FlSpot(i.toDouble(), m.bodyFatPct!));
    }

    final hasWeight = pointsKg.length >= 2;

    if (!hasWeight) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: theme.colorScheme.outline),
        ),
        child: Row(
          children: [
            Icon(Icons.show_chart_rounded, color: theme.colorScheme.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Aggiungi almeno 2 misurazioni con il peso per vedere il grafico.',
                style: theme.textTheme.bodySmall,
              ),
            ),
          ],
        ),
      );
    }

    final minY = pointsKg.map((p) => p.y).reduce((a, b) => a < b ? a : b);
    final maxY = pointsKg.map((p) => p.y).reduce((a, b) => a > b ? a : b);
    final pad = (maxY - minY) * 0.2 + 1;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Andamento peso',
                  style: theme.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(width: 8),
              Text(
                '${pointsKg.first.y.toStringAsFixed(1)} → ${pointsKg.last.y.toStringAsFixed(1)} kg',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
          const SizedBox(height: 12),
          AspectRatio(
            aspectRatio: 1.6,
            child: LineChart(
              LineChartData(
                minY: minY - pad,
                maxY: maxY + pad,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: ((maxY - minY) / 3).clamp(0.5, 10),
                  getDrawingHorizontalLine: (_) => FlLine(
                    color: theme.colorScheme.outline.withValues(alpha: 0.4),
                    strokeWidth: 1,
                  ),
                ),
                borderData: FlBorderData(show: false),
                titlesData: const FlTitlesData(show: false),
                lineTouchData: LineTouchData(
                  touchTooltipData: LineTouchTooltipData(
                    getTooltipColor: (_) => theme.colorScheme.primary,
                    tooltipRoundedRadius: 10,
                    getTooltipItems: (spots) => spots
                        .map(
                          (s) => LineTooltipItem(
                            '${s.y.toStringAsFixed(1)} kg',
                            const TextStyle(
                              color: AppColors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
                lineBarsData: [
                  LineChartBarData(
                    spots: pointsKg,
                    isCurved: true,
                    curveSmoothness: 0.25,
                    color: theme.colorScheme.primary,
                    barWidth: 3,
                    dotData: FlDotData(
                      show: true,
                      getDotPainter: (s, p, b, i) => FlDotCirclePainter(
                        radius: 3,
                        color: theme.colorScheme.primary,
                        strokeWidth: 0,
                      ),
                    ),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          theme.colorScheme.primary.withValues(alpha: 0.25),
                          theme.colorScheme.primary.withValues(alpha: 0.0),
                        ],
                      ),
                    ),
                  ),
                  if (pointsBf.length >= 2)
                    LineChartBarData(
                      spots: pointsBf,
                      isCurved: true,
                      curveSmoothness: 0.25,
                      color: AppColors.brandAccent,
                      barWidth: 2,
                      dashArray: const [4, 4],
                      dotData: const FlDotData(show: false),
                    ),
                ],
              ),
            ),
          ),
          if (pointsBf.length >= 2) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Container(
                  width: 14,
                  height: 2,
                  color: AppColors.brandAccent,
                ),
                const SizedBox(width: 6),
                Text('Body fat %', style: theme.textTheme.bodySmall),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ───────────────────────────── Training Stats Cards ─────────────────────────────

class _TrainingStatsCards extends ConsumerWidget {
  const _TrainingStatsCards();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncStats = ref.watch(progressTrainingStatsProvider);
    return asyncStats.when(
      loading: () => const _StatsCardsSkeleton(),
      error: (_, _) => const SizedBox.shrink(),
      data: (s) {
        final hasVolume = s.weeklyVolume.any((w) => w.volume > 0);
        final hasGroups = s.muscleGroups.isNotEmpty;
        if (!hasVolume && !hasGroups) return const SizedBox.shrink();
        return Column(
          children: [
            if (hasVolume) _VolumeChartCard(weeks: s.weeklyVolume),
            if (hasVolume && hasGroups) const SizedBox(height: 16),
            if (hasGroups) _MuscleGroupsCard(groups: s.muscleGroups),
          ],
        );
      },
    );
  }
}

class _StatsCardsSkeleton extends StatelessWidget {
  const _StatsCardsSkeleton();
  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        Skeleton(height: 200, radius: 16),
        SizedBox(height: 16),
        Skeleton(height: 200, radius: 16),
      ],
    );
  }
}

class _VolumeChartCard extends StatelessWidget {
  const _VolumeChartCard({required this.weeks});
  final List<WeeklyVolumeBucket> weeks;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final maxVol = weeks.fold<int>(0, (m, w) => w.volume > m ? w.volume : m);
    final totalVol = weeks.fold<int>(0, (a, w) => a + w.volume);
    final lastVol = weeks.isNotEmpty ? weeks.last.volume : 0;

    String fmtVol(int v) {
      if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}k';
      return v.toString();
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Volume settimanale',
                  style: theme.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700)),
              const Spacer(),
              Text(
                'Tot: ${fmtVol(totalVol)} kg',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            lastVol > 0
                ? 'Questa settimana: ${fmtVol(lastVol)} kg'
                : 'Questa settimana: nessun allenamento',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 110,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (var i = 0; i < weeks.length; i++) ...[
                  Expanded(
                    child: _VolumeBar(
                      week: weeks[i],
                      maxVol: maxVol,
                      isLast: i == weeks.length - 1,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  if (i != weeks.length - 1) const SizedBox(width: 6),
                ],
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (var i = 0; i < weeks.length; i++) ...[
                Expanded(
                  child: Text(
                    _shortLabel(weeks[i].weekStart),
                    textAlign: TextAlign.center,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.textTheme.bodySmall?.color,
                    ),
                  ),
                ),
                if (i != weeks.length - 1) const SizedBox(width: 6),
              ],
            ],
          ),
        ],
      ),
    );
  }

  String _shortLabel(DateTime d) {
    final months = [
      'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
      'lug', 'ago', 'set', 'ott', 'nov', 'dic',
    ];
    return '${d.day}/${months[d.month - 1]}';
  }
}

class _VolumeBar extends StatelessWidget {
  const _VolumeBar({
    required this.week,
    required this.maxVol,
    required this.isLast,
    required this.color,
  });
  final WeeklyVolumeBucket week;
  final int maxVol;
  final bool isLast;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ratio = maxVol > 0 ? (week.volume / maxVol).clamp(0.05, 1.0) : 0.05;
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        if (week.volume > 0)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text(
              week.volume >= 1000
                  ? '${(week.volume / 1000).toStringAsFixed(1)}k'
                  : week.volume.toString(),
              style: theme.textTheme.labelSmall?.copyWith(
                fontSize: 9,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        Container(
          height: (ratio * 80).toDouble(),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                isLast
                    ? color
                    : color.withValues(alpha: 0.55),
                color.withValues(alpha: isLast ? 0.65 : 0.3),
              ],
            ),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          ),
        ),
      ],
    );
  }
}

class _MuscleGroupsCard extends StatelessWidget {
  const _MuscleGroupsCard({required this.groups});
  final List<MuscleGroupBucket> groups;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = groups.fold<int>(0, (a, b) => a + b.count);
    final maxCount = groups.fold<int>(0, (m, g) => g.count > m ? g.count : m);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Distribuzione gruppi muscolari',
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(
            'Ultimi 30 giorni · $total esercizi loggati',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 14),
          for (final g in groups)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _MuscleGroupRow(
                group: g,
                ratio: maxCount > 0 ? g.count / maxCount : 0,
                primary: theme.colorScheme.primary,
              ),
            ),
        ],
      ),
    );
  }
}

class _MuscleGroupRow extends StatelessWidget {
  const _MuscleGroupRow({
    required this.group,
    required this.ratio,
    required this.primary,
  });

  final MuscleGroupBucket group;
  final double ratio;
  final Color primary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              _capitalize(group.gruppo),
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              '${group.count}',
              style: theme.textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w700,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Container(
          height: 6,
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(3),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: ratio.clamp(0.05, 1.0),
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [primary, primary.withValues(alpha: 0.6)],
                ),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
        ),
      ],
    );
  }

  String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

class _MeasurementRow extends ConsumerWidget {
  const _MeasurementRow({required this.measurement});
  final BodyMeasurement measurement;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final m = measurement;
    final stats = <String>[];
    if (m.pesoKg != null) stats.add('${m.pesoKg!.toStringAsFixed(1)} kg');
    if (m.bodyFatPct != null) stats.add('BF ${m.bodyFatPct!.toStringAsFixed(1)}%');
    if (m.vitaCm != null) stats.add('Vita ${m.vitaCm!.toStringAsFixed(0)} cm');

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onLongPress: () => _confirmDelete(context, ref),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            border: Border.all(color: theme.colorScheme.outline),
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Icon(Icons.monitor_weight_rounded,
                    color: theme.colorScheme.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(formatDateItShort(m.date),
                        style: theme.textTheme.titleSmall),
                    if (stats.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        stats.join(' · '),
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                    if (m.note != null && m.note!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        m.note!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              IconButton(
                icon: Icon(Icons.delete_outline_rounded,
                    color: theme.textTheme.bodySmall?.color),
                onPressed: () => _confirmDelete(context, ref),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Elimina misurazione'),
        content: const Text('Sei sicuro di voler eliminare questa misurazione?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annulla'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Elimina'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref
          .read(progressRepositoryProvider)
          .deleteMeasurement(measurement.id);
      ref.invalidate(measurementsProvider);
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : 'Errore')),
      );
    }
  }
}

// ───────────────────────────── Add Measurement Sheet ─────────────────────────────

class _AddMeasurementSheet extends ConsumerStatefulWidget {
  const _AddMeasurementSheet();

  @override
  ConsumerState<_AddMeasurementSheet> createState() => _AddMeasurementSheetState();
}

class _AddMeasurementSheetState extends ConsumerState<_AddMeasurementSheet> {
  DateTime _date = DateTime.now();
  final _peso = TextEditingController();
  final _bf = TextEditingController();
  final _vita = TextEditingController();
  final _fianchi = TextEditingController();
  final _petto = TextEditingController();
  final _braccio = TextEditingController();
  final _coscia = TextEditingController();
  final _note = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _peso.dispose();
    _bf.dispose();
    _vita.dispose();
    _fianchi.dispose();
    _petto.dispose();
    _braccio.dispose();
    _coscia.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (d != null) setState(() => _date = d);
  }

  Future<void> _save() async {
    if (_peso.text.isEmpty &&
        _bf.text.isEmpty &&
        _vita.text.isEmpty &&
        _fianchi.text.isEmpty &&
        _petto.text.isEmpty &&
        _braccio.text.isEmpty &&
        _coscia.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inserisci almeno una misura')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(progressRepositoryProvider).addMeasurement(
            date: _date,
            pesoKg: _peso.text.trim().isEmpty ? null : _peso.text.trim(),
            bodyFatPct: _bf.text.trim().isEmpty ? null : _bf.text.trim(),
            vitaCm: _vita.text.trim().isEmpty ? null : _vita.text.trim(),
            fianchiCm: _fianchi.text.trim().isEmpty ? null : _fianchi.text.trim(),
            pettoCm: _petto.text.trim().isEmpty ? null : _petto.text.trim(),
            braccioCm: _braccio.text.trim().isEmpty ? null : _braccio.text.trim(),
            cosciaCm: _coscia.text.trim().isEmpty ? null : _coscia.text.trim(),
            note: _note.text.trim().isEmpty ? null : _note.text.trim(),
          );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : 'Errore')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final inset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: inset),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.dividerColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('Nuova misurazione', style: theme.textTheme.headlineSmall),
            const SizedBox(height: 4),
            Text(
              'Tocca un campo e inserisci il valore. Lascia vuoto ciò che non vuoi tracciare.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Row(
                  children: [
                    Icon(Icons.calendar_today_rounded,
                        size: 18, color: theme.colorScheme.primary),
                    const SizedBox(width: 10),
                    Text(formatDateItLong(_date),
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        )),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(child: _NumField(label: 'Peso (kg)', controller: _peso)),
                const SizedBox(width: 10),
                Expanded(child: _NumField(label: 'Body fat %', controller: _bf)),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _NumField(label: 'Vita (cm)', controller: _vita)),
                const SizedBox(width: 10),
                Expanded(child: _NumField(label: 'Fianchi (cm)', controller: _fianchi)),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _NumField(label: 'Petto (cm)', controller: _petto)),
                const SizedBox(width: 10),
                Expanded(child: _NumField(label: 'Braccio (cm)', controller: _braccio)),
              ],
            ),
            const SizedBox(height: 10),
            _NumField(label: 'Coscia (cm)', controller: _coscia),
            const SizedBox(height: 10),
            TextField(
              controller: _note,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Note (facoltative)',
              ),
            ),
            const SizedBox(height: 20),
            PrimaryButton(
              label: 'Salva misurazione',
              icon: Icons.save_rounded,
              onPressed: _saving ? null : _save,
              loading: _saving,
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _saving ? null : () => Navigator.pop(context, false),
              child: const Text('Annulla'),
            ),
          ],
        ),
      ),
    );
  }
}

class _NumField extends StatelessWidget {
  const _NumField({required this.label, required this.controller});
  final String label;
  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      decoration: InputDecoration(
        labelText: label,
        floatingLabelBehavior: FloatingLabelBehavior.auto,
      ),
    );
  }
}

// ───────────────────────────── States ─────────────────────────────

class _LoadingState extends StatelessWidget {
  const _LoadingState();
  @override
  Widget build(BuildContext context) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: const [
          Skeleton(height: 220, radius: 16),
          SizedBox(height: 16),
          Skeleton(height: 80, radius: 12),
          SizedBox(height: 12),
          Skeleton(height: 80, radius: 12),
          SizedBox(height: 12),
          Skeleton(height: 80, radius: 12),
        ],
      );
}

class _EmptyMeasurementsState extends StatelessWidget {
  const _EmptyMeasurementsState();
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 80, 32, 32),
      child: Column(
        children: [
          Icon(
            Icons.monitor_weight_rounded,
            size: 64,
            color: theme.colorScheme.primary.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          Text(
            'Nessuna misurazione',
            style: theme.textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Tocca "Nuova misura" per registrare la prima.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
        ],
      ).animate().fadeIn(duration: 300.ms),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 100),
        Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            children: [
              Icon(Icons.cloud_off_rounded,
                  size: 56, color: AppColors.danger),
              const SizedBox(height: 16),
              Text('Errore di caricamento', style: theme.textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(message,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium),
              const SizedBox(height: 16),
              FilledButton.tonalIcon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Riprova'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
