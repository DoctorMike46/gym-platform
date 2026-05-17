import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_radius.dart';
import '../../../core/widgets/top_bar_actions.dart';
import '../../questionnaires/data/questionnaires_repository.dart';

class AltroPage extends ConsumerWidget {
  const AltroPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pendingQuestionnaires = ref.watch(pendingQuestionnairesProvider);
    final pendingCount = pendingQuestionnaires.maybeWhen(
      data: (items) => items.length,
      orElse: () => 0,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Altro'),
        actions: const [TopBarActions()],
      ),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          const _SectionTitle(title: 'Sessioni'),
          const _MenuTile(
            icon: Icons.event_available_outlined,
            title: 'Prenotazioni',
            subtitle: 'Prenota o gestisci le sessioni con il trainer',
            route: '/bookings',
          ),
          _MenuTile(
            icon: Icons.checklist_rounded,
            title: 'Questionari',
            subtitle: 'Compila i questionari del tuo trainer',
            route: '/questionnaires',
            badge: pendingCount > 0 ? pendingCount : null,
          ),
          const SizedBox(height: 16),
          const _SectionTitle(title: 'Abbonamento'),
          const _MenuTile(
            icon: Icons.card_membership_outlined,
            title: 'Pacchetti',
            subtitle: 'Vedi tutti i servizi del tuo trainer',
            route: '/packages',
          ),
          const _MenuTile(
            icon: Icons.receipt_long_outlined,
            title: 'I miei abbonamenti',
            subtitle: 'Storico e stato attuale',
            route: '/subscriptions',
          ),
          const SizedBox(height: 16),
          const _SectionTitle(title: 'Contenuti'),
          const _MenuTile(
            icon: Icons.folder_outlined,
            title: 'Documenti',
            subtitle: 'Schede, certificati, consensi',
            route: '/documents',
          ),
          const _MenuTile(
            icon: Icons.campaign_outlined,
            title: 'Annunci',
            subtitle: 'Comunicazioni e offerte del tuo trainer',
            route: '/announcements',
          ),
          const SizedBox(height: 16),
          const _SectionTitle(title: 'Account e privacy'),
          const _MenuTile(
            icon: Icons.shield_outlined,
            title: 'Privacy e dati',
            subtitle: 'Consensi, export dati, elimina account',
            route: '/privacy',
          ),
          const _MenuTile(
            icon: Icons.fingerprint,
            title: 'Blocco biometrico',
            subtitle: 'Sblocca l\'app con Face ID o impronta',
            route: '/settings/biometric',
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 8, 4, 8),
      child: Text(
        title.toUpperCase(),
        style: theme.textTheme.labelMedium?.copyWith(
          letterSpacing: 0.6,
          color: theme.textTheme.bodySmall?.color,
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.title,
    required this.route,
    this.subtitle,
    this.badge,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final String route;
  final int? badge;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.md),
          onTap: () => context.push(route),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: Icon(icon, size: 18, color: theme.colorScheme.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(subtitle!, style: theme.textTheme.bodySmall),
                      ],
                    ],
                  ),
                ),
                if (badge != null && badge! > 0) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary,
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                    ),
                    child: Text(
                      '$badge',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 11,
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                ],
                Icon(
                  Icons.chevron_right_rounded,
                  color: theme.textTheme.bodySmall?.color,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
