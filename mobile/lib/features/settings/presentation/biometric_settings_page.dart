import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/biometric/biometric_service.dart';

/// Pagina impostazioni per H7 — opt-in / opt-out del biometric lock.
///
/// Collegabile dalla profile/altro page con:
///   `context.push('/settings/biometric')`
class BiometricSettingsPage extends ConsumerStatefulWidget {
  const BiometricSettingsPage({super.key});

  @override
  ConsumerState<BiometricSettingsPage> createState() => _BiometricSettingsPageState();
}

class _BiometricSettingsPageState extends ConsumerState<BiometricSettingsPage> {
  bool _busy = false;
  bool? _enabled;
  bool _capable = false;
  String? _statusMessage;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    final service = ref.read(biometricServiceProvider);
    final capable = await service.isDeviceCapable();
    final enabled = await service.isEnabled();
    if (!mounted) return;
    setState(() {
      _capable = capable;
      _enabled = enabled;
      if (!capable) {
        _statusMessage =
            'Il tuo device non supporta la biometria oppure non hai configurato Face ID / impronta nelle impostazioni di sistema.';
      } else {
        _statusMessage = null;
      }
    });
  }

  Future<void> _toggle(bool newValue) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _statusMessage = null;
    });

    final service = ref.read(biometricServiceProvider);
    final gate = ref.read(biometricGateControllerProvider.notifier);

    if (newValue) {
      // Attivazione: richiediamo conferma biometrica prima di salvare
      // (così verifichiamo che funzioni davvero).
      final result = await service.authenticate(
        reason: 'Conferma la tua identità per attivare il blocco biometrico',
      );
      if (result == BiometricResult.success) {
        await service.setEnabled(true);
        gate.enableAlreadyUnlocked();
        if (!mounted) return;
        setState(() {
          _enabled = true;
          _busy = false;
          _statusMessage = 'Blocco biometrico attivato.';
        });
      } else {
        if (!mounted) return;
        setState(() {
          _busy = false;
          _statusMessage = result == BiometricResult.cancelled
              ? 'Operazione annullata.'
              : 'Verifica biometrica non riuscita.';
        });
      }
    } else {
      // Disattivazione: nessuna conferma extra
      await service.setEnabled(false);
      gate.disable();
      if (!mounted) return;
      setState(() {
        _enabled = false;
        _busy = false;
        _statusMessage = 'Blocco biometrico disattivato.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final enabled = _enabled ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Blocco biometrico'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: SwitchListTile(
                  value: enabled,
                  onChanged: (_capable && !_busy) ? _toggle : null,
                  title: const Text('Sblocca l\'app con biometria'),
                  subtitle: Text(
                    _capable
                        ? 'Usa Face ID, Touch ID o impronta digitale ad ogni avvio dell\'app.'
                        : 'Non disponibile su questo device.',
                  ),
                  secondary: Icon(
                    Icons.fingerprint,
                    color: _capable ? theme.colorScheme.primary : theme.disabledColor,
                  ),
                ),
              ),
              if (_statusMessage != null) ...[
                const SizedBox(height: 12),
                Text(
                  _statusMessage!,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: enabled
                        ? theme.colorScheme.primary
                        : theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Text(
                'Cosa fa questa impostazione',
                style: theme.textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              Text(
                'Quando attivata, l\'app ti chiede di sbloccare con Face ID '
                '(o equivalente Android) ad ogni avvio. La tua sessione '
                'rimane attiva, ma serve la tua identità biometrica per '
                'visualizzare i contenuti.\n\n'
                'Se disabiliti la biometria dalle impostazioni di sistema, '
                'l\'app tornerà al comportamento standard.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
