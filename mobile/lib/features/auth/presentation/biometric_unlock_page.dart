import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/biometric/biometric_service.dart';
import 'auth_controller.dart';

/// Schermata di sblocco biometrico (H7).
///
/// Viene mostrata se:
///   - utente loggato (session valida + token presenti)
///   - biometric_enabled = true (opt-in dalle impostazioni)
///   - device capable + enrolled
///
/// Flow:
///   - all'apertura, prompt biometrico automatico
///   - successo → unlock → router redirect a /home
///   - cancellato/fallito → l'utente può ritentare o fare logout
class BiometricUnlockPage extends ConsumerStatefulWidget {
  const BiometricUnlockPage({super.key});

  @override
  ConsumerState<BiometricUnlockPage> createState() => _BiometricUnlockPageState();
}

class _BiometricUnlockPageState extends ConsumerState<BiometricUnlockPage> {
  bool _busy = false;
  String? _errorMessage;
  bool _autoPromptedOnce = false;

  @override
  void initState() {
    super.initState();
    // Trigger biometric automatico al primo build (post-frame per evitare
    // race con il routing).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_autoPromptedOnce && mounted) {
        _autoPromptedOnce = true;
        _tryAuth();
      }
    });
  }

  Future<void> _tryAuth() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _errorMessage = null;
    });

    final service = ref.read(biometricServiceProvider);
    final result = await service.authenticate(
      reason: 'Sblocca per accedere al tuo profilo',
    );

    if (!mounted) return;

    switch (result) {
      case BiometricResult.success:
        ref.read(biometricGateControllerProvider.notifier).unlock();
        // Il router redirect porterà automaticamente a /home.
        break;
      case BiometricResult.cancelled:
        setState(() {
          _errorMessage = null;
          _busy = false;
        });
        break;
      case BiometricResult.failed:
        setState(() {
          _errorMessage = 'Autenticazione non riuscita. Riprova.';
          _busy = false;
        });
        break;
    }
  }

  Future<void> _logout() async {
    await ref.read(authControllerProvider.notifier).logout();
    // Dopo logout, lo stato auth diventa unauthenticated → router → /login
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              Icon(Icons.lock_outline, size: 72, color: theme.colorScheme.primary),
              const SizedBox(height: 24),
              Text(
                'Accesso protetto',
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(
                'Usa il tuo riconoscimento biometrico per sbloccare l\'app.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
                ),
              ],
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _busy ? null : _tryAuth,
                  icon: const Icon(Icons.fingerprint),
                  label: Text(_busy ? 'Verifica in corso...' : 'Sblocca'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _busy ? null : _logout,
                child: const Text('Esci dall\'account'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
