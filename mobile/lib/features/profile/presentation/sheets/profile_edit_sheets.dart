import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/primary_button.dart';
import '../../data/profile_extended_repository.dart';
import '../../domain/extended_profile.dart';

/// Wrapper grafico condiviso per i sheet di edit del profilo.
class _SheetScaffold extends StatelessWidget {
  const _SheetScaffold({required this.title, required this.child});
  final String title;
  final Widget child;

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
            const SizedBox(height: AppSpacing.lg),
            Text(title, style: theme.textTheme.headlineSmall),
            const SizedBox(height: AppSpacing.lg),
            child,
          ],
        ),
      ),
    );
  }
}

void _snack(BuildContext context, String text) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
}

// ═════════════════════════ PHYSICAL ═════════════════════════

class PhysicalEditSheet extends ConsumerStatefulWidget {
  const PhysicalEditSheet({super.key, required this.initial});
  final PhysicalData initial;

  @override
  ConsumerState<PhysicalEditSheet> createState() => _PhysicalEditSheetState();
}

class _PhysicalEditSheetState extends ConsumerState<PhysicalEditSheet> {
  late final TextEditingController _peso = TextEditingController(text: widget.initial.peso ?? '');
  late final TextEditingController _altezza = TextEditingController(text: widget.initial.altezza ?? '');
  late final TextEditingController _eta = TextEditingController(text: widget.initial.eta?.toString() ?? '');
  String? _sesso;
  String? _livello;
  bool _saving = false;

  static const _sessoOptions = ['M', 'F', 'altro'];
  static const _sessoLabels = {'M': 'Maschile', 'F': 'Femminile', 'altro': 'Altro'};
  static const _livelliOptions = [
    'sedentario',
    'leggero',
    'moderato',
    'intenso',
    'molto_intenso',
  ];
  static const _livelliLabels = {
    'sedentario': 'Sedentario',
    'leggero': 'Leggero',
    'moderato': 'Moderato',
    'intenso': 'Intenso',
    'molto_intenso': 'Molto intenso',
  };

  @override
  void initState() {
    super.initState();
    _sesso = widget.initial.sesso;
    _livello = widget.initial.livelloAttivita;
  }

  @override
  void dispose() {
    _peso.dispose();
    _altezza.dispose();
    _eta.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(profileExtendedRepositoryProvider).updatePhysical(
            peso: _peso.text.trim().isEmpty ? null : _peso.text.trim(),
            altezza: _altezza.text.trim().isEmpty ? null : _altezza.text.trim(),
            eta: _eta.text.trim().isEmpty ? null : int.tryParse(_eta.text.trim()),
            sesso: _sesso,
            livelloAttivita: _livello,
          );
      ref.invalidate(extendedProfileProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      _snack(context, 'Dati fisici aggiornati');
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _SheetScaffold(
      title: 'Dati fisici',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Expanded(
              child: TextField(
                controller: _peso,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Peso (kg)'),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: TextField(
                controller: _altezza,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Altezza (cm)'),
              ),
            ),
          ]),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _eta,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Età'),
          ),
          const SizedBox(height: AppSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _sesso,
            decoration: const InputDecoration(labelText: 'Sesso'),
            items: _sessoOptions
                .map((s) => DropdownMenuItem(value: s, child: Text(_sessoLabels[s]!)))
                .toList(),
            onChanged: (v) => setState(() => _sesso = v),
          ),
          const SizedBox(height: AppSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _livello,
            decoration: const InputDecoration(labelText: 'Livello attività'),
            items: _livelliOptions
                .map((s) => DropdownMenuItem(value: s, child: Text(_livelliLabels[s]!)))
                .toList(),
            onChanged: (v) => setState(() => _livello = v),
          ),
          const SizedBox(height: AppSpacing.xl),
          PrimaryButton(
            label: 'Salva',
            icon: Icons.save_rounded,
            onPressed: _saving ? null : _save,
            loading: _saving,
          ),
          TextButton(
            onPressed: _saving ? null : () => Navigator.of(context).pop(),
            child: const Text('Annulla'),
          ),
        ],
      ),
    );
  }
}

// ═════════════════════════ GOALS ═════════════════════════

class GoalsEditSheet extends ConsumerStatefulWidget {
  const GoalsEditSheet({super.key, required this.initial});
  final GoalData initial;

  @override
  ConsumerState<GoalsEditSheet> createState() => _GoalsEditSheetState();
}

class _GoalsEditSheetState extends ConsumerState<GoalsEditSheet> {
  late final TextEditingController _timeframe =
      TextEditingController(text: widget.initial.timeframeSettimane?.toString() ?? '');
  late final TextEditingController _pesoTarget =
      TextEditingController(text: widget.initial.pesoTargetKg ?? '');
  late final TextEditingController _motivazione =
      TextEditingController(text: widget.initial.motivazione ?? '');
  String? _obiettivo;
  bool _saving = false;

  static const _obiettivi = [
    'dimagrimento',
    'massa',
    'mantenimento',
    'performance',
    'salute',
    'ricomposizione',
  ];
  static const _obiettiviLabels = {
    'dimagrimento': 'Dimagrimento',
    'massa': 'Aumento massa',
    'mantenimento': 'Mantenimento',
    'performance': 'Performance',
    'salute': 'Salute',
    'ricomposizione': 'Ricomposizione',
  };

  @override
  void initState() {
    super.initState();
    _obiettivo = widget.initial.obiettivo;
  }

  @override
  void dispose() {
    _timeframe.dispose();
    _pesoTarget.dispose();
    _motivazione.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(profileExtendedRepositoryProvider).updateGoals(
            obiettivo: _obiettivo,
            timeframeSettimane: _timeframe.text.trim().isEmpty
                ? null
                : int.tryParse(_timeframe.text.trim()),
            pesoTargetKg: _pesoTarget.text.trim().isEmpty ? null : _pesoTarget.text.trim(),
            motivazione: _motivazione.text.trim().isEmpty ? null : _motivazione.text.trim(),
          );
      ref.invalidate(extendedProfileProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      _snack(context, 'Obiettivi aggiornati');
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _SheetScaffold(
      title: 'Obiettivi',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _obiettivo,
            decoration: const InputDecoration(labelText: 'Obiettivo'),
            items: _obiettivi
                .map((s) => DropdownMenuItem(value: s, child: Text(_obiettiviLabels[s]!)))
                .toList(),
            onChanged: (v) => setState(() => _obiettivo = v),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _timeframe,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Settimane'),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: TextField(
                controller: _pesoTarget,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Peso target (kg)'),
              ),
            ),
          ]),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _motivazione,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Cosa ti motiva?',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          PrimaryButton(
            label: 'Salva',
            icon: Icons.save_rounded,
            onPressed: _saving ? null : _save,
            loading: _saving,
          ),
          TextButton(
            onPressed: _saving ? null : () => Navigator.of(context).pop(),
            child: const Text('Annulla'),
          ),
        ],
      ),
    );
  }
}

// ═════════════════════════ NUTRITION PREFS ═════════════════════════

class NutritionPrefsEditSheet extends ConsumerStatefulWidget {
  const NutritionPrefsEditSheet({super.key, required this.initial});
  final NutritionPreferences initial;

  @override
  ConsumerState<NutritionPrefsEditSheet> createState() =>
      _NutritionPrefsEditSheetState();
}

class _NutritionPrefsEditSheetState
    extends ConsumerState<NutritionPrefsEditSheet> {
  String? _regime;
  late List<String> _allergeni;
  late List<String> _intolleranze;
  late List<String> _preferiti;
  late List<String> _evitati;
  late final TextEditingController _note = TextEditingController(
      text: widget.initial.noteAggiuntive ?? '');
  bool _saving = false;

  static const _regimi = [
    'onnivoro',
    'vegetariano',
    'vegano',
    'pescetariano',
    'altro',
  ];

  static const _commonAllergens = [
    'glutine', 'lattosio', 'frutta_secca', 'arachidi', 'uova',
    'pesce', 'crostacei', 'soia', 'sedano', 'senape', 'lupini', 'molluschi',
  ];

  @override
  void initState() {
    super.initState();
    _regime = widget.initial.regimeAlimentare;
    _allergeni = List.of(widget.initial.allergeni ?? const []);
    _intolleranze = List.of(widget.initial.intolleranze ?? const []);
    _preferiti = List.of(widget.initial.preferenzeAlimenti ?? const []);
    _evitati = List.of(widget.initial.esclusioniAlimenti ?? const []);
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(profileExtendedRepositoryProvider).updateNutritionPrefs(
            regimeAlimentare: _regime,
            allergeni: _allergeni,
            intolleranze: _intolleranze,
            preferenzeAlimenti: _preferiti,
            esclusioniAlimenti: _evitati,
            noteAggiuntive:
                _note.text.trim().isEmpty ? null : _note.text.trim(),
          );
      ref.invalidate(extendedProfileProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      _snack(context, 'Preferenze alimentari aggiornate');
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _addCustom(List<String> target, String hint) async {
    final ctrl = TextEditingController();
    final value = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(hint),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Aggiungi…'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annulla')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
            child: const Text('OK'),
          ),
        ],
      ),
    );
    ctrl.dispose();
    if (value != null && value.isNotEmpty && !target.contains(value)) {
      setState(() => target.add(value));
    }
  }

  Widget _chipGroup({
    required String label,
    required List<String> values,
    List<String> suggestions = const [],
    String addHint = 'Aggiungi voce',
  }) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.labelLarge),
        const SizedBox(height: AppSpacing.sm),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final v in values)
              InputChip(
                label: Text(v),
                onDeleted: () => setState(() => values.remove(v)),
              ),
            for (final s in suggestions.where((s) => !values.contains(s)))
              ActionChip(
                avatar: const Icon(Icons.add, size: 16),
                label: Text(s),
                onPressed: () => setState(() => values.add(s)),
              ),
            ActionChip(
              avatar: const Icon(Icons.edit, size: 16),
              label: const Text('Personalizzato'),
              onPressed: () => _addCustom(values, addHint),
            ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return _SheetScaffold(
      title: 'Alimentazione',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _regime,
            decoration: const InputDecoration(labelText: 'Regime alimentare'),
            items: _regimi
                .map((s) => DropdownMenuItem(
                      value: s,
                      child: Text(s[0].toUpperCase() + s.substring(1)),
                    ))
                .toList(),
            onChanged: (v) => setState(() => _regime = v),
          ),
          const SizedBox(height: AppSpacing.lg),
          _chipGroup(
            label: 'Allergeni',
            values: _allergeni,
            suggestions: _commonAllergens,
            addHint: 'Allergene',
          ),
          const SizedBox(height: AppSpacing.lg),
          _chipGroup(
            label: 'Intolleranze',
            values: _intolleranze,
            addHint: 'Intolleranza',
          ),
          const SizedBox(height: AppSpacing.lg),
          _chipGroup(
            label: 'Cibi preferiti',
            values: _preferiti,
            addHint: 'Cibo preferito',
          ),
          const SizedBox(height: AppSpacing.lg),
          _chipGroup(
            label: 'Cibi da evitare',
            values: _evitati,
            addHint: 'Cibo da evitare',
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _note,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Note al trainer',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          PrimaryButton(
            label: 'Salva',
            icon: Icons.save_rounded,
            onPressed: _saving ? null : _save,
            loading: _saving,
          ),
          TextButton(
            onPressed: _saving ? null : () => Navigator.of(context).pop(),
            child: const Text('Annulla'),
          ),
        ],
      ),
    );
  }
}

// ═════════════════════════ LIFESTYLE ═════════════════════════

class LifestyleEditSheet extends ConsumerStatefulWidget {
  const LifestyleEditSheet({super.key, required this.initial});
  final LifestyleData initial;

  @override
  ConsumerState<LifestyleEditSheet> createState() => _LifestyleEditSheetState();
}

class _LifestyleEditSheetState extends ConsumerState<LifestyleEditSheet> {
  late final TextEditingController _sonno =
      TextEditingController(text: widget.initial.oreSonnoMedie?.toString() ?? '');
  late final TextEditingController _pasti =
      TextEditingController(text: widget.initial.nPastiDie?.toString() ?? '');
  late final TextEditingController _acqua =
      TextEditingController(text: widget.initial.consumoAcquaLitri ?? '');
  late final TextEditingController _occasioni = TextEditingController(
      text: widget.initial.occasioniSocialiSettimana?.toString() ?? '');
  late double _stress;
  String? _fumo;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _stress = (widget.initial.livelloStress ?? 5).toDouble();
    _fumo = widget.initial.fumo;
  }

  @override
  void dispose() {
    _sonno.dispose();
    _pasti.dispose();
    _acqua.dispose();
    _occasioni.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(profileExtendedRepositoryProvider).updateLifestyle(
            oreSonnoMedie:
                _sonno.text.trim().isEmpty ? null : int.tryParse(_sonno.text.trim()),
            nPastiDie:
                _pasti.text.trim().isEmpty ? null : int.tryParse(_pasti.text.trim()),
            consumoAcquaLitri:
                _acqua.text.trim().isEmpty ? null : _acqua.text.trim(),
            occasioniSocialiSettimana: _occasioni.text.trim().isEmpty
                ? null
                : int.tryParse(_occasioni.text.trim()),
            livelloStress: _stress.round(),
            fumo: _fumo,
          );
      ref.invalidate(extendedProfileProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      _snack(context, 'Lifestyle aggiornato');
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _SheetScaffold(
      title: 'Stile di vita',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Expanded(
              child: TextField(
                controller: _sonno,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Ore di sonno'),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: TextField(
                controller: _pasti,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Pasti al giorno'),
              ),
            ),
          ]),
          const SizedBox(height: AppSpacing.md),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _acqua,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Acqua (L/die)'),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: TextField(
                controller: _occasioni,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Cene fuori/sett.'),
              ),
            ),
          ]),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Livello stress: ${_stress.round()}/10',
            style: theme.textTheme.labelLarge,
          ),
          Slider(
            value: _stress,
            min: 1,
            max: 10,
            divisions: 9,
            label: _stress.round().toString(),
            onChanged: (v) => setState(() => _stress = v),
          ),
          const SizedBox(height: AppSpacing.sm),
          DropdownButtonFormField<String>(
            initialValue: _fumo,
            decoration: const InputDecoration(labelText: 'Fumo'),
            items: const [
              DropdownMenuItem(value: 'no', child: Text('No')),
              DropdownMenuItem(value: 'si', child: Text('Sì')),
              DropdownMenuItem(value: 'ex', child: Text('Ex fumatore')),
            ],
            onChanged: (v) => setState(() => _fumo = v),
          ),
          const SizedBox(height: AppSpacing.xl),
          PrimaryButton(
            label: 'Salva',
            icon: Icons.save_rounded,
            onPressed: _saving ? null : _save,
            loading: _saving,
          ),
          TextButton(
            onPressed: _saving ? null : () => Navigator.of(context).pop(),
            child: const Text('Annulla'),
          ),
        ],
      ),
    );
  }
}

// ═════════════════════════ MEDICAL HISTORY (GDPR art.9) ═════════════════════════

class MedicalEditSheet extends ConsumerStatefulWidget {
  const MedicalEditSheet({super.key, required this.initial});
  final MedicalHistory initial;

  @override
  ConsumerState<MedicalEditSheet> createState() => _MedicalEditSheetState();
}

class _MedicalEditSheetState extends ConsumerState<MedicalEditSheet> {
  late final TextEditingController _patologie =
      TextEditingController(text: widget.initial.patologie ?? '');
  late final TextEditingController _farmaci =
      TextEditingController(text: widget.initial.farmaci ?? '');
  late final TextEditingController _note =
      TextEditingController(text: widget.initial.note ?? '');
  bool _disclaimer = false;
  bool _saving = false;

  bool get _needsDisclaimer => !widget.initial.hasAcceptedDisclaimer;

  @override
  void dispose() {
    _patologie.dispose();
    _farmaci.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_needsDisclaimer && !_disclaimer) {
      _snack(context, 'Devi accettare il disclaimer GDPR');
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(profileExtendedRepositoryProvider).updateMedical(
            patologie: _patologie.text.trim().isEmpty ? null : _patologie.text.trim(),
            farmaci: _farmaci.text.trim().isEmpty ? null : _farmaci.text.trim(),
            note: _note.text.trim().isEmpty ? null : _note.text.trim(),
            acceptDisclaimer: _disclaimer || !_needsDisclaimer,
          );
      ref.invalidate(extendedProfileProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      _snack(context, 'Storico medico aggiornato (cifrato)');
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _SheetScaffold(
      title: 'Storico medico',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: theme.colorScheme.primary.withValues(alpha: 0.2)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.lock_outline, size: 18, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'I dati sanitari sono cifrati a riposo (AES-256-GCM, GDPR art.9). '
                    'Solo tu e il tuo trainer potete leggerli.',
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          TextField(
            controller: _patologie,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Patologie croniche',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _farmaci,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Farmaci in uso',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _note,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Note utili al trainer',
              alignLabelWithHint: true,
            ),
          ),
          if (_needsDisclaimer) ...[
            const SizedBox(height: AppSpacing.md),
            CheckboxListTile(
              value: _disclaimer,
              onChanged: (v) => setState(() => _disclaimer = v ?? false),
              controlAffinity: ListTileControlAffinity.leading,
              title: Text(
                'Acconsento al trattamento dei miei dati sanitari (GDPR art.9) '
                'per la finalità di programmazione personalizzata.',
                style: theme.textTheme.bodySmall,
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.lg),
          PrimaryButton(
            label: 'Salva',
            icon: Icons.lock_rounded,
            onPressed: _saving ? null : _save,
            loading: _saving,
          ),
          TextButton(
            onPressed: _saving ? null : () => Navigator.of(context).pop(),
            child: const Text('Annulla'),
          ),
        ],
      ),
    );
  }
}
