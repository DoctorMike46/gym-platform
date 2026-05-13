import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../shared/utils/date_format_it.dart';
import '../data/bookings_repository.dart';

class BookingsListPage extends ConsumerWidget {
  const BookingsListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Le mie prenotazioni'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => Navigator.of(context).maybePop(),
          ),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'In arrivo'),
              Tab(text: 'Passate'),
            ],
          ),
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => context.push('/bookings/new'),
          icon: const Icon(Icons.add_rounded),
          label: const Text('Prenota'),
        ),
        body: const TabBarView(
          children: [
            _ApptList(timeframe: 'upcoming'),
            _ApptList(timeframe: 'past'),
          ],
        ),
      ),
    );
  }
}

class _ApptList extends ConsumerWidget {
  const _ApptList({required this.timeframe});
  final String timeframe;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncList = ref.watch(myAppointmentsProvider(timeframe));
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(myAppointmentsProvider(timeframe)),
      child: asyncList.when(
        loading: () => const SkeletonList(itemCount: 3, itemHeight: 96),
        error: (e, _) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            const SizedBox(height: 80),
            _ErrorBlock(
              message: e is ApiException ? e.message : 'Errore di caricamento',
              onRetry: () =>
                  ref.invalidate(myAppointmentsProvider(timeframe)),
            ),
          ],
        ),
        data: (items) {
          if (items.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                _EmptyState(
                  isUpcoming: timeframe == 'upcoming',
                ),
              ],
            );
          }
          return ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, i) =>
                _AppointmentCard(appt: items[i], ref: ref),
          );
        },
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  const _AppointmentCard({required this.appt, required this.ref});
  final Appointment appt;
  final WidgetRef ref;

  Color _color(BuildContext context) {
    final hex = appt.typeColore ?? '#3b82f6';
    try {
      return Color(int.parse(hex.replaceFirst('#', '0xff')));
    } catch (_) {
      return Theme.of(context).colorScheme.primary;
    }
  }

  ({String label, Color color}) _statusBadge(BuildContext context) {
    final theme = Theme.of(context);
    switch (appt.status) {
      case 'pending':
        return (label: 'In attesa', color: Colors.amber.shade700);
      case 'confirmed':
        return (label: 'Confermata', color: theme.colorScheme.primary);
      case 'completed':
        return (label: 'Completata', color: Colors.grey.shade600);
      case 'cancelled_client':
      case 'cancelled_trainer':
        return (label: 'Cancellata', color: AppColors.danger);
      case 'no_show':
        return (label: 'Assente', color: Colors.orange.shade700);
      default:
        return (label: appt.status, color: Colors.grey);
    }
  }

  Future<void> _confirmCancel(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancellare la prenotazione?'),
        content: const Text(
          'Verrà notificato al trainer. Possibile fino a 4h prima.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Indietro'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cancella'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(bookingsRepositoryProvider).cancel(appt.id);
      ref.invalidate(myAppointmentsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e is ApiException ? e.message : 'Errore',
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _color(context);
    final sb = _statusBadge(context);
    final canCancel = appt.isPending || appt.isConfirmed;

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 56,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Column(
                  children: [
                    Text(
                      _monthShort(appt.startAt),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: color,
                        letterSpacing: 0.4,
                      ),
                    ),
                    Text(
                      '${appt.startAt.day}',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: color,
                        height: 1,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      appt.typeNome ?? 'Sessione',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${formatTimeIt(appt.startAt)} – ${formatTimeIt(appt.endAt)}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: sb.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text(
                  sb.label,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: sb.color,
                    letterSpacing: 0.4,
                  ),
                ),
              ),
            ],
          ),
          if (appt.clienteNote != null && appt.clienteNote!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Text(
                'Nota: ${appt.clienteNote!}',
                style: theme.textTheme.bodySmall,
              ),
            ),
          ],
          if (appt.cancelledReason != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.danger.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(
                  color: AppColors.danger.withValues(alpha: 0.25),
                ),
              ),
              child: Text(
                'Motivo cancellazione: ${appt.cancelledReason}',
                style: theme.textTheme.bodySmall,
              ),
            ),
          ],
          if (canCancel) ...[
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _confirmCancel(context),
                icon: const Icon(Icons.close_rounded, size: 16),
                label: const Text('Cancella'),
                style: TextButton.styleFrom(foregroundColor: AppColors.danger),
              ),
            ),
          ],
        ],
      ),
    );
  }

  static String _monthShort(DateTime d) {
    const months = [
      'GEN',
      'FEB',
      'MAR',
      'APR',
      'MAG',
      'GIU',
      'LUG',
      'AGO',
      'SET',
      'OTT',
      'NOV',
      'DIC',
    ];
    return months[d.month - 1];
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.isUpcoming});
  final bool isUpcoming;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 80, 32, 32),
      child: Column(
        children: [
          Icon(
            Icons.event_available_rounded,
            size: 64,
            color: theme.colorScheme.primary.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          Text(
            isUpcoming ? 'Nessuna prenotazione' : 'Nessuna sessione passata',
            style: theme.textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          if (isUpcoming)
            Text(
              'Tocca "Prenota" in basso per fissare una sessione con il tuo trainer.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            )
          else
            Text(
              'Le sessioni che farai appariranno qui.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
        ],
      ),
    );
  }
}

class _ErrorBlock extends StatelessWidget {
  const _ErrorBlock({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(Icons.cloud_off_rounded, size: 56, color: AppColors.danger),
          const SizedBox(height: 16),
          Text('Errore di caricamento', style: theme.textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          FilledButton.tonalIcon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Riprova'),
          ),
        ],
      ),
    );
  }
}
