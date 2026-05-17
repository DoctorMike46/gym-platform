import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/branding_logo.dart';
import '../../../core/widgets/primary_button.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../health/presentation/health_card.dart';
import '../data/profile_extended_repository.dart';
import '../domain/extended_profile.dart';
import 'sheets/profile_edit_sheets.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final auth = ref.watch(authControllerProvider);
    final profile = auth.profile;
    final branding = auth.branding;
    final themeMode = ref.watch(themeControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profilo')),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          // Header user card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  theme.colorScheme.primary,
                  Color.lerp(theme.colorScheme.primary, AppColors.brandAccent, 0.4) ??
                      theme.colorScheme.primary,
                ],
              ),
              borderRadius: BorderRadius.circular(AppRadius.xl),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (branding?.siteName != null)
                  Row(
                    children: [
                      BrandingLogo(url: branding?.logoUrl, size: 32),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          branding!.siteName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.white.withValues(alpha: 0.85),
                          ),
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: AppColors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        _initials(profile?.fullName),
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppColors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            profile?.fullName ?? 'Atleta',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppColors.white,
                              letterSpacing: -0.2,
                            ),
                          ),
                          if (profile?.email != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              profile!.email,
                              style: TextStyle(
                                fontSize: 13,
                                color: AppColors.white.withValues(alpha: 0.85),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),
          _SectionTitle(title: 'Le mie informazioni'),
          const _MyInformationSection(),

          const SizedBox(height: 16),
          _SectionTitle(title: 'Account'),
          _SettingTile(
            icon: Icons.person_outline_rounded,
            title: 'Modifica profilo',
            subtitle: profile?.telefono != null && profile!.telefono!.isNotEmpty
                ? 'Tel: ${profile.telefono}'
                : 'Aggiungi telefono',
            onTap: () => _showEditProfile(context, ref, profile),
          ),
          _SettingTile(
            icon: Icons.lock_outline_rounded,
            title: 'Cambia password',
            onTap: () => _showChangePassword(context, ref),
          ),

          const SizedBox(height: 16),
          _SectionTitle(title: 'Salute'),
          const HealthBiometricsCard(),

          const SizedBox(height: 16),
          _SectionTitle(title: 'Privacy e dati'),
          _SettingTile(
            icon: Icons.shield_outlined,
            title: 'Privacy e dati',
            subtitle: 'Consensi, export dati, elimina account',
            onTap: () => context.push('/privacy'),
          ),

          const SizedBox(height: 16),
          _SectionTitle(title: 'Aspetto'),
          _ThemeToggleTile(currentMode: themeMode),

          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () => _confirmLogout(context, ref),
            icon: const Icon(Icons.logout_rounded, color: AppColors.danger),
            label: const Text('Esci', style: TextStyle(color: AppColors.danger)),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              side: const BorderSide(color: AppColors.danger),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
            ),
          ),

          const SizedBox(height: 16),
          Center(
            child: Text(
              'Gym Platform · v1.0.0',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.textTheme.bodySmall?.color?.withValues(alpha: 0.6),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static String _initials(String? name) {
    if (name == null || name.trim().isEmpty) return '·';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  Future<void> _showChangePassword(BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const _ChangePasswordSheet(),
    );
  }

  Future<void> _showEditProfile(
    BuildContext context,
    WidgetRef ref,
    dynamic profile,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _EditProfileSheet(initialPhone: profile?.telefono),
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Esci?'),
        content: const Text(
          'Dovrai accedere di nuovo per usare l\'app.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annulla'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Esci'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await ref.read(authControllerProvider.notifier).logout();
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

class _SettingTile extends StatelessWidget {
  const _SettingTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.subtitle,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

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
          onTap: onTap,
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

class _ThemeToggleTile extends ConsumerWidget {
  const _ThemeToggleTile({required this.currentMode});
  final ThemeMode currentMode;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: Icon(
                  Icons.brightness_6_outlined,
                  size: 18,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Tema',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SegmentedButton<ThemeMode>(
            segments: const [
              ButtonSegment(
                value: ThemeMode.system,
                label: Text('Auto'),
                icon: Icon(Icons.brightness_auto_rounded, size: 16),
              ),
              ButtonSegment(
                value: ThemeMode.light,
                label: Text('Chiaro'),
                icon: Icon(Icons.light_mode_outlined, size: 16),
              ),
              ButtonSegment(
                value: ThemeMode.dark,
                label: Text('Scuro'),
                icon: Icon(Icons.dark_mode_outlined, size: 16),
              ),
            ],
            selected: {currentMode},
            onSelectionChanged: (s) {
              ref.read(themeControllerProvider.notifier).setMode(s.first);
            },
          ),
        ],
      ),
    );
  }
}

// ───────────────────────────── Edit Profile Sheet ─────────────────────────────

class _EditProfileSheet extends ConsumerStatefulWidget {
  const _EditProfileSheet({this.initialPhone});
  final String? initialPhone;

  @override
  ConsumerState<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends ConsumerState<_EditProfileSheet> {
  late final TextEditingController _phoneCtrl =
      TextEditingController(text: widget.initialPhone ?? '');
  bool _saving = false;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final ok = await ref.read(authControllerProvider.notifier).updateProfile(
          telefono: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        );
    if (!mounted) return;
    setState(() => _saving = false);
    if (ok) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profilo aggiornato')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Errore aggiornamento')),
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
            Text('Modifica profilo', style: theme.textTheme.headlineSmall),
            const SizedBox(height: 16),
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Telefono',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Per modificare nome, email o altri dati, contatta il tuo trainer.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            PrimaryButton(
              label: 'Salva',
              icon: Icons.save_rounded,
              onPressed: _saving ? null : _save,
              loading: _saving,
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _saving ? null : () => Navigator.of(context).pop(),
              child: const Text('Annulla'),
            ),
          ],
        ),
      ),
    );
  }
}

// ───────────────────────────── Change Password Sheet ─────────────────────────────

class _ChangePasswordSheet extends ConsumerStatefulWidget {
  const _ChangePasswordSheet();

  @override
  ConsumerState<_ChangePasswordSheet> createState() =>
      _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends ConsumerState<_ChangePasswordSheet> {
  final _current = TextEditingController();
  final _newPwd = TextEditingController();
  final _confirm = TextEditingController();
  bool _obscure1 = true;
  bool _obscure2 = true;
  bool _saving = false;

  @override
  void dispose() {
    _current.dispose();
    _newPwd.dispose();
    _confirm.dispose();
    super.dispose();
  }

  String? _validate() {
    if (_current.text.isEmpty) return 'Inserisci la password attuale';
    if (_newPwd.text.length < 10) return 'La nuova password deve avere almeno 10 caratteri';
    if (!RegExp(r'[A-Za-z]').hasMatch(_newPwd.text)) return 'Almeno una lettera';
    if (!RegExp(r'[0-9]').hasMatch(_newPwd.text)) return 'Almeno una cifra';
    if (_newPwd.text != _confirm.text) return 'Le password non coincidono';
    return null;
  }

  Future<void> _save() async {
    final err = _validate();
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(authRepositoryProvider).changePassword(
            currentPassword: _current.text,
            newPassword: _newPwd.text,
          );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password aggiornata')),
      );
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
            Text('Cambia password', style: theme.textTheme.headlineSmall),
            const SizedBox(height: 4),
            Text(
              'Almeno 10 caratteri, una lettera e una cifra.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _current,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Password attuale',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _newPwd,
              obscureText: _obscure1,
              decoration: InputDecoration(
                labelText: 'Nuova password',
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscure1
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                  onPressed: () => setState(() => _obscure1 = !_obscure1),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _confirm,
              obscureText: _obscure2,
              decoration: InputDecoration(
                labelText: 'Conferma nuova password',
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscure2
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                  onPressed: () => setState(() => _obscure2 = !_obscure2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            PrimaryButton(
              label: 'Aggiorna password',
              icon: Icons.save_rounded,
              onPressed: _saving ? null : _save,
              loading: _saving,
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _saving ? null : () => Navigator.of(context).pop(),
              child: const Text('Annulla'),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────── Le mie informazioni (estese) ─────────────────────

class _MyInformationSection extends ConsumerWidget {
  const _MyInformationSection();

  Future<void> _openSheet(BuildContext context, Widget sheet) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => sheet,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(extendedProfileProvider);

    return async.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Text(
          'Impossibile caricare le informazioni',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ),
      data: (p) {
        final injuriesActive = p.injuries
            .where((i) => (i as Map<String, dynamic>)['stato'] == 'attivo')
            .length;
        return Column(
          children: [
            _SettingTile(
              icon: Icons.fitness_center_outlined,
              title: 'Dati fisici',
              subtitle: _summarizePhysical(p.physical),
              onTap: () => _openSheet(context, PhysicalEditSheet(initial: p.physical)),
            ),
            _SettingTile(
              icon: Icons.flag_outlined,
              title: 'Obiettivi',
              subtitle: p.goals.obiettivo != null
                  ? _capitalize(p.goals.obiettivo!)
                  : 'Non impostati',
              onTap: () => _openSheet(context, GoalsEditSheet(initial: p.goals)),
            ),
            _SettingTile(
              icon: Icons.restaurant_outlined,
              title: 'Alimentazione',
              subtitle: _summarizeNutrition(p.nutritionPreferences),
              onTap: () => _openSheet(
                  context, NutritionPrefsEditSheet(initial: p.nutritionPreferences)),
            ),
            _SettingTile(
              icon: Icons.nightlight_round,
              title: 'Stile di vita',
              subtitle: _summarizeLifestyle(p.lifestyle),
              onTap: () => _openSheet(context, LifestyleEditSheet(initial: p.lifestyle)),
            ),
            _SettingTile(
              icon: Icons.medical_information_outlined,
              title: 'Storico medico',
              subtitle: p.medicalHistory.hasContent
                  ? 'Compilato (cifrato)'
                  : 'Aggiungi patologie e farmaci',
              onTap: () =>
                  _openSheet(context, MedicalEditSheet(initial: p.medicalHistory)),
            ),
            _SettingTile(
              icon: Icons.healing_outlined,
              title: 'Infortuni',
              subtitle: injuriesActive > 0
                  ? '$injuriesActive attivo${injuriesActive == 1 ? "" : "i"}'
                  : 'Nessuno registrato',
              onTap: () => context.push('/profile/injuries'),
            ),
          ],
        );
      },
    );
  }

  String _summarizePhysical(PhysicalData p) {
    final parts = <String>[];
    if (p.peso != null) parts.add('${p.peso} kg');
    if (p.altezza != null) parts.add('${p.altezza} cm');
    if (p.eta != null) parts.add('${p.eta} anni');
    if (parts.isEmpty) return 'Aggiungi peso, altezza, età';
    return parts.join(' · ');
  }

  String _summarizeNutrition(NutritionPreferences n) {
    final parts = <String>[];
    if (n.regimeAlimentare != null) parts.add(_capitalize(n.regimeAlimentare!));
    final all = n.allergeni?.length ?? 0;
    if (all > 0) parts.add('$all allergen${all == 1 ? "e" : "i"}');
    if (parts.isEmpty) return 'Regime, allergeni, preferenze';
    return parts.join(' · ');
  }

  String _summarizeLifestyle(LifestyleData l) {
    final parts = <String>[];
    if (l.oreSonnoMedie != null) parts.add('${l.oreSonnoMedie}h sonno');
    if (l.nPastiDie != null) parts.add('${l.nPastiDie} pasti/die');
    if (parts.isEmpty) return 'Sonno, pasti, stress, fumo';
    return parts.join(' · ');
  }

  String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

