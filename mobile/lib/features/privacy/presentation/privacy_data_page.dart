import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/env.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/account_gdpr_repository.dart';

class PrivacyDataPage extends ConsumerWidget {
  const PrivacyDataPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final consentsAsync = ref.watch(consentsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Privacy e dati')),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          _SectionTitle(title: 'Documenti'),
          _Tile(
            icon: Icons.shield_outlined,
            title: 'Informativa privacy',
            subtitle: 'Come trattiamo i tuoi dati',
            onTap: () => _openWeb(context, '/legal/privacy'),
            trailingIcon: Icons.open_in_new_rounded,
          ),
          _Tile(
            icon: Icons.description_outlined,
            title: 'Termini di servizio',
            subtitle: 'Regole di utilizzo dell\'app',
            onTap: () => _openWeb(context, '/legal/terms'),
            trailingIcon: Icons.open_in_new_rounded,
          ),

          const SizedBox(height: 16),
          _SectionTitle(title: 'I tuoi consensi'),
          consentsAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (err, _) => _ErrorBox(message: err.toString()),
            data: (consents) => _ConsentsCard(consents: consents),
          ),

          const SizedBox(height: 16),
          _SectionTitle(title: 'I tuoi diritti'),
          _Tile(
            icon: Icons.download_rounded,
            title: 'Scarica i miei dati',
            subtitle:
                'Esporta in JSON tutto ciò che è collegato al tuo account',
            onTap: () => _exportData(context, ref),
          ),
          _Tile(
            icon: Icons.delete_forever_rounded,
            title: 'Elimina il mio account',
            subtitle: 'Cancella in modo definitivo dati e accesso',
            iconColor: AppColors.danger,
            onTap: () => _confirmDelete(context, ref),
          ),

          const SizedBox(height: 24),
          Text(
            'L\'esercizio dei diritti GDPR è gratuito. Per richieste particolari (rettifica, opposizione, limitazione) contatta il tuo trainer.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.textTheme.bodySmall?.color?.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openWeb(BuildContext context, String path) async {
    final uri = Uri.parse('${Env.apiBaseUrl}$path');
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossibile aprire il link')),
      );
    }
  }

  Future<void> _exportData(BuildContext context, WidgetRef ref) async {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final raw = await ref.read(accountGdprRepositoryProvider).exportData();

      // Salviamo in documents dir e proponiamo "Apri" / "Copia"
      final dir = await getApplicationDocumentsDirectory();
      final today = DateTime.now().toIso8601String().substring(0, 10);
      final file = File('${dir.path}/dati-personali-$today.json');
      await file.writeAsString(raw, flush: true);

      if (!context.mounted) return;
      Navigator.of(context).pop(); // chiude loader

      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Export completato'),
          content: Text(
            'I tuoi dati sono stati esportati in formato JSON e salvati nello storage dell\'app:\n\n${file.path}\n\nPuoi copiare il contenuto negli appunti per inviartelo via email.',
          ),
          actions: [
            TextButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: raw));
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Copiato negli appunti')),
                );
              },
              child: const Text('Copia JSON'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!context.mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Errore export'),
        ),
      );
    }
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const _DeleteAccountSheet(),
    );
  }
}

// ──────────────────────── ConsentsCard ────────────────────────

class _ConsentsCard extends ConsumerStatefulWidget {
  const _ConsentsCard({required this.consents});
  final GdprConsents consents;

  @override
  ConsumerState<_ConsentsCard> createState() => _ConsentsCardState();
}

class _ConsentsCardState extends ConsumerState<_ConsentsCard> {
  late bool _marketing = widget.consents.marketingEnabled;
  bool _saving = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      padding: const EdgeInsets.fromLTRB(14, 6, 14, 6),
      child: Column(
        children: [
          _ConsentRow(
            label: 'Termini di servizio',
            granted: widget.consents.termsAcceptedAt != null,
            date: widget.consents.termsAcceptedAt,
            locked: true,
          ),
          const Divider(height: 1),
          _ConsentRow(
            label: 'Privacy Policy',
            granted: widget.consents.privacyAcceptedAt != null,
            date: widget.consents.privacyAcceptedAt,
            locked: true,
          ),
          const Divider(height: 1),
          _ConsentRow(
            label: 'Trattamento dati di salute (art. 9 GDPR)',
            granted: widget.consents.healthDataConsentAt != null,
            date: widget.consents.healthDataConsentAt,
            locked: true,
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: SwitchListTile.adaptive(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text(
                'Comunicazioni di marketing',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: Text(
                widget.consents.marketingConsentAt != null
                    ? 'Attivo dal ${_fmt(widget.consents.marketingConsentAt!)}'
                    : 'Non attivo',
                style: theme.textTheme.bodySmall,
              ),
              value: _marketing,
              onChanged: _saving ? null : _toggleMarketing,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _toggleMarketing(bool v) async {
    setState(() {
      _marketing = v;
      _saving = true;
    });
    try {
      await ref
          .read(accountGdprRepositoryProvider)
          .setMarketing(v);
      ref.invalidate(consentsProvider);
    } catch (e) {
      if (!mounted) return;
      setState(() => _marketing = !v);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : 'Errore')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

class _ConsentRow extends StatelessWidget {
  const _ConsentRow({
    required this.label,
    required this.granted,
    required this.locked,
    this.date,
  });
  final String label;
  final bool granted;
  final DateTime? date;
  final bool locked;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Icon(
            granted
                ? Icons.check_circle_rounded
                : Icons.radio_button_unchecked_rounded,
            size: 20,
            color: granted ? AppColors.success : theme.disabledColor,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (date != null)
                  Text(
                    'Concesso il ${_fmt(date!)}',
                    style: theme.textTheme.bodySmall,
                  ),
              ],
            ),
          ),
          if (locked)
            Icon(
              Icons.lock_outline_rounded,
              size: 14,
              color: theme.disabledColor,
            ),
        ],
      ),
    );
  }
}

String _fmt(DateTime d) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(d.day)}/${two(d.month)}/${d.year}';
}

// ──────────────────────── DeleteAccountSheet ────────────────────────

class _DeleteAccountSheet extends ConsumerStatefulWidget {
  const _DeleteAccountSheet();

  @override
  ConsumerState<_DeleteAccountSheet> createState() =>
      _DeleteAccountSheetState();
}

class _DeleteAccountSheetState extends ConsumerState<_DeleteAccountSheet> {
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscure = true;
  bool _processing = false;
  String? _error;

  @override
  void dispose() {
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_passwordCtrl.text.isEmpty) {
      setState(() => _error = 'Inserisci la password attuale');
      return;
    }
    if (_confirmCtrl.text.trim() != 'ELIMINA') {
      setState(() => _error = 'Digita ELIMINA per confermare');
      return;
    }

    setState(() {
      _processing = true;
      _error = null;
    });

    try {
      await ref
          .read(accountGdprRepositoryProvider)
          .deleteAccount(password: _passwordCtrl.text);

      if (!mounted) return;
      Navigator.of(context).pop(); // chiudi sheet

      // Forza logout locale (i token sono già invalidi server-side)
      await ref.read(authControllerProvider.notifier).logout();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Account eliminato. Tutti i tuoi dati sono stati cancellati.'),
          duration: Duration(seconds: 5),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _processing = false;
        _error = e is ApiException ? e.message : 'Errore durante la cancellazione';
      });
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
            Row(
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  size: 28,
                  color: AppColors.danger,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Elimina il tuo account',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.danger.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(
                  color: AppColors.danger.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Cosa verrà cancellato:',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.danger,
                    ),
                  ),
                  const SizedBox(height: 6),
                  _BulletLine(text: 'Profilo, anagrafica, password e accessi'),
                  _BulletLine(text: 'Schede, log allenamenti e progressi'),
                  _BulletLine(text: 'Misure, foto e documenti caricati'),
                  _BulletLine(text: 'Chat, prenotazioni, questionari'),
                  _BulletLine(
                    text:
                        'L\'operazione è irreversibile. Considera di scaricare prima i tuoi dati.',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordCtrl,
              obscureText: _obscure,
              decoration: InputDecoration(
                labelText: 'Conferma con la tua password',
                prefixIcon: const Icon(Icons.lock_outline_rounded),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscure
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _confirmCtrl,
              autocorrect: false,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(
                labelText: 'Digita ELIMINA per confermare',
                hintText: 'ELIMINA',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: TextStyle(color: AppColors.danger, fontSize: 13),
              ),
            ],
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _processing ? null : _submit,
              icon: _processing
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.delete_forever_rounded),
              label: Text(
                _processing
                    ? 'Cancellazione in corso…'
                    : 'Elimina definitivamente',
              ),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.danger,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed:
                  _processing ? null : () => Navigator.of(context).pop(),
              child: const Text('Annulla'),
            ),
          ],
        ),
      ),
    );
  }
}

class _BulletLine extends StatelessWidget {
  const _BulletLine({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ', style: TextStyle(fontWeight: FontWeight.w900)),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 13, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

// ──────────────────────── Shared visual helpers ────────────────────────

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

class _Tile extends StatelessWidget {
  const _Tile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.iconColor,
    this.trailingIcon,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;
  final Color? iconColor;
  final IconData? trailingIcon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = iconColor ?? theme.colorScheme.primary;
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
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: Icon(icon, size: 18, color: color),
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
                        Text(
                          subtitle!,
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ],
                  ),
                ),
                Icon(
                  trailingIcon ?? Icons.chevron_right_rounded,
                  color: theme.textTheme.bodySmall?.color,
                  size: 18,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Text(
        message,
        style: const TextStyle(color: AppColors.danger, fontSize: 13),
      ),
    );
  }
}
