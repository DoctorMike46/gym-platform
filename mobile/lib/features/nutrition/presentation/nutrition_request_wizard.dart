import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/primary_button.dart';
import '../../profile/data/profile_extended_repository.dart';
import '../../profile/domain/extended_profile.dart';
import '../data/nutrition_request_repository.dart';
import '../domain/nutrition_request.dart';

// ─────────────────────── State ───────────────────────

class WizardState {
  WizardState({
    this.obiettivo,
    this.timeframeSettimane,
    this.pesoTargetKg,
    this.motivazione,
    this.regimeAlimentare,
    List<String>? allergeni,
    List<String>? intolleranze,
    List<String>? cibiPreferiti,
    List<String>? cibiEvitati,
    this.nPastiDie,
    List<String>? orariPasti,
    this.occasioniSociali,
    this.oreSonno,
    this.livelloStress,
    this.consumoAcquaLitri,
    this.fumo,
    this.patologie,
    this.farmaci,
    this.noteLibere,
    this.acceptMedicalDisclaimer = false,
  })  : allergeni = allergeni ?? const [],
        intolleranze = intolleranze ?? const [],
        cibiPreferiti = cibiPreferiti ?? const [],
        cibiEvitati = cibiEvitati ?? const [],
        orariPasti = orariPasti ?? const [];

  final Obiettivo? obiettivo;
  final int? timeframeSettimane;
  final String? pesoTargetKg;
  final String? motivazione;
  final String? regimeAlimentare;
  final List<String> allergeni;
  final List<String> intolleranze;
  final List<String> cibiPreferiti;
  final List<String> cibiEvitati;
  final int? nPastiDie;
  final List<String> orariPasti;
  final int? occasioniSociali;
  final int? oreSonno;
  final int? livelloStress;
  final String? consumoAcquaLitri;
  final String? fumo;
  final String? patologie;
  final String? farmaci;
  final String? noteLibere;
  final bool acceptMedicalDisclaimer;

  WizardState copyWith({
    Object? obiettivo = _unset,
    Object? timeframeSettimane = _unset,
    Object? pesoTargetKg = _unset,
    Object? motivazione = _unset,
    Object? regimeAlimentare = _unset,
    List<String>? allergeni,
    List<String>? intolleranze,
    List<String>? cibiPreferiti,
    List<String>? cibiEvitati,
    Object? nPastiDie = _unset,
    List<String>? orariPasti,
    Object? occasioniSociali = _unset,
    Object? oreSonno = _unset,
    Object? livelloStress = _unset,
    Object? consumoAcquaLitri = _unset,
    Object? fumo = _unset,
    Object? patologie = _unset,
    Object? farmaci = _unset,
    Object? noteLibere = _unset,
    bool? acceptMedicalDisclaimer,
  }) {
    return WizardState(
      obiettivo: obiettivo == _unset ? this.obiettivo : obiettivo as Obiettivo?,
      timeframeSettimane: timeframeSettimane == _unset
          ? this.timeframeSettimane
          : timeframeSettimane as int?,
      pesoTargetKg:
          pesoTargetKg == _unset ? this.pesoTargetKg : pesoTargetKg as String?,
      motivazione:
          motivazione == _unset ? this.motivazione : motivazione as String?,
      regimeAlimentare: regimeAlimentare == _unset
          ? this.regimeAlimentare
          : regimeAlimentare as String?,
      allergeni: allergeni ?? this.allergeni,
      intolleranze: intolleranze ?? this.intolleranze,
      cibiPreferiti: cibiPreferiti ?? this.cibiPreferiti,
      cibiEvitati: cibiEvitati ?? this.cibiEvitati,
      nPastiDie: nPastiDie == _unset ? this.nPastiDie : nPastiDie as int?,
      orariPasti: orariPasti ?? this.orariPasti,
      occasioniSociali: occasioniSociali == _unset
          ? this.occasioniSociali
          : occasioniSociali as int?,
      oreSonno: oreSonno == _unset ? this.oreSonno : oreSonno as int?,
      livelloStress:
          livelloStress == _unset ? this.livelloStress : livelloStress as int?,
      consumoAcquaLitri: consumoAcquaLitri == _unset
          ? this.consumoAcquaLitri
          : consumoAcquaLitri as String?,
      fumo: fumo == _unset ? this.fumo : fumo as String?,
      patologie: patologie == _unset ? this.patologie : patologie as String?,
      farmaci: farmaci == _unset ? this.farmaci : farmaci as String?,
      noteLibere:
          noteLibere == _unset ? this.noteLibere : noteLibere as String?,
      acceptMedicalDisclaimer:
          acceptMedicalDisclaimer ?? this.acceptMedicalDisclaimer,
    );
  }
}

// Sentinella per distinguere "non passato" da "passato null" in copyWith.
const Object _unset = Object();

class WizardController extends StateNotifier<WizardState> {
  WizardController() : super(WizardState());

  void hydrateFromProfile(ExtendedProfile p) {
    Obiettivo? obiettivoDaProfilo;
    if (state.obiettivo == null && p.goals.obiettivo != null) {
      try {
        obiettivoDaProfilo = Obiettivo.values.byName(p.goals.obiettivo!);
      } catch (_) {
        // ignore: nome non corrisponde
      }
    }
    state = state.copyWith(
      obiettivo: state.obiettivo ?? obiettivoDaProfilo,
      pesoTargetKg: state.pesoTargetKg ?? p.goals.pesoTargetKg,
      motivazione: state.motivazione ?? p.goals.motivazione,
      timeframeSettimane:
          state.timeframeSettimane ?? p.goals.timeframeSettimane,
      regimeAlimentare:
          state.regimeAlimentare ?? p.nutritionPreferences.regimeAlimentare,
      allergeni: state.allergeni.isEmpty &&
              p.nutritionPreferences.allergeni != null
          ? List.of(p.nutritionPreferences.allergeni!)
          : state.allergeni,
      intolleranze: state.intolleranze.isEmpty &&
              p.nutritionPreferences.intolleranze != null
          ? List.of(p.nutritionPreferences.intolleranze!)
          : state.intolleranze,
      cibiPreferiti: state.cibiPreferiti.isEmpty &&
              p.nutritionPreferences.preferenzeAlimenti != null
          ? List.of(p.nutritionPreferences.preferenzeAlimenti!)
          : state.cibiPreferiti,
      cibiEvitati: state.cibiEvitati.isEmpty &&
              p.nutritionPreferences.esclusioniAlimenti != null
          ? List.of(p.nutritionPreferences.esclusioniAlimenti!)
          : state.cibiEvitati,
      nPastiDie: state.nPastiDie ?? p.lifestyle.nPastiDie,
      orariPasti:
          state.orariPasti.isEmpty && p.lifestyle.orariPasti != null
              ? List.of(p.lifestyle.orariPasti!)
              : state.orariPasti,
      occasioniSociali:
          state.occasioniSociali ?? p.lifestyle.occasioniSocialiSettimana,
      oreSonno: state.oreSonno ?? p.lifestyle.oreSonnoMedie,
      livelloStress: state.livelloStress ?? p.lifestyle.livelloStress,
      consumoAcquaLitri:
          state.consumoAcquaLitri ?? p.lifestyle.consumoAcquaLitri,
      fumo: state.fumo ?? p.lifestyle.fumo,
      patologie: state.patologie ?? p.medicalHistory.patologie,
      farmaci: state.farmaci ?? p.medicalHistory.farmaci,
      acceptMedicalDisclaimer: state.acceptMedicalDisclaimer ||
          p.medicalHistory.hasAcceptedDisclaimer,
    );
  }

  /// Aggiorna lo stato passando una copyWith. Esempio:
  ///   c.set((s) => s.copyWith(obiettivo: Obiettivo.dimagrimento));
  void set(WizardState Function(WizardState s) mutator) {
    state = mutator(state);
  }
}

final wizardControllerProvider =
    StateNotifierProvider.autoDispose<WizardController, WizardState>(
        (ref) => WizardController());

// ─────────────────────── Wizard Page ───────────────────────

class NutritionRequestWizardPage extends ConsumerStatefulWidget {
  const NutritionRequestWizardPage({super.key});

  @override
  ConsumerState<NutritionRequestWizardPage> createState() =>
      _NutritionRequestWizardPageState();
}

class _NutritionRequestWizardPageState
    extends ConsumerState<NutritionRequestWizardPage> {
  final _pageCtrl = PageController();
  int _step = 0;
  bool _submitting = false;
  bool _hydrated = false;

  static const _totalSteps = 6;

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  void _next() {
    if (_step < _totalSteps - 1) {
      _pageCtrl.nextPage(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    }
  }

  void _prev() {
    if (_step > 0) {
      _pageCtrl.previousPage(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> _submit() async {
    final s = ref.read(wizardControllerProvider);
    if (s.obiettivo == null) return;
    setState(() => _submitting = true);
    try {
      final payload = CreateNutritionRequestPayload(
        obiettivo: s.obiettivo!.apiValue,
        timeframeSettimane: s.timeframeSettimane,
        pesoTargetKg: s.pesoTargetKg,
        motivazione: s.motivazione,
        regimeAlimentare: s.regimeAlimentare,
        allergeni: s.allergeni.isEmpty ? null : s.allergeni,
        intolleranze: s.intolleranze.isEmpty ? null : s.intolleranze,
        cibiPreferiti: s.cibiPreferiti.isEmpty ? null : s.cibiPreferiti,
        cibiEvitati: s.cibiEvitati.isEmpty ? null : s.cibiEvitati,
        nPastiDie: s.nPastiDie,
        orariPasti: s.orariPasti.isEmpty ? null : s.orariPasti,
        occasioniSociali: s.occasioniSociali,
        oreSonno: s.oreSonno,
        livelloStress: s.livelloStress,
        consumoAcquaLitri: s.consumoAcquaLitri,
        fumo: s.fumo,
        patologie: s.patologie,
        farmaci: s.farmaci,
        noteLibere: s.noteLibere,
      );

      await ref.read(nutritionRequestRepositoryProvider).create(payload);
      ref.invalidate(activeNutritionRequestProvider);
      if (!mounted) return;
      context.pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Richiesta inviata al tuo trainer')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ref.watch(wizardControllerProvider);
    final profileAsync = ref.watch(extendedProfileProvider);

    // Hydrate dal profilo (una volta sola)
    profileAsync.whenData((p) {
      if (!_hydrated) {
        _hydrated = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          ref.read(wizardControllerProvider.notifier).hydrateFromProfile(p);
        });
      }
    });

    final canProceed = _canProceed(state, _step);
    final isLastStep = _step == _totalSteps - 1;

    return Scaffold(
      appBar: AppBar(
        title: Text('Step ${_step + 1} di $_totalSteps'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          LinearProgressIndicator(
            value: (_step + 1) / _totalSteps,
            color: theme.colorScheme.primary,
            backgroundColor: theme.dividerColor,
          ),
          Expanded(
            child: PageView(
              controller: _pageCtrl,
              onPageChanged: (i) => setState(() => _step = i),
              physics: const NeverScrollableScrollPhysics(),
              children: const [
                _StepObiettivo(),
                _StepAlimentazione(),
                _StepPreferenzePasti(),
                _StepLifestyle(),
                _StepMedico(),
                _StepReview(),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Row(
              children: [
                if (_step > 0)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _submitting ? null : _prev,
                      child: const Text('Indietro'),
                    ),
                  ),
                if (_step > 0) const SizedBox(width: AppSpacing.md),
                Expanded(
                  flex: _step == 0 ? 1 : 1,
                  child: PrimaryButton(
                    label: isLastStep ? 'Invia richiesta' : 'Avanti',
                    icon: isLastStep ? Icons.send_rounded : Icons.arrow_forward,
                    onPressed: !canProceed || _submitting
                        ? null
                        : (isLastStep ? _submit : _next),
                    loading: _submitting,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  bool _canProceed(WizardState s, int step) {
    switch (step) {
      case 0:
        return s.obiettivo != null;
      default:
        return true;
    }
  }
}

// ─────────────────────── Step widgets ───────────────────────

abstract class _StepBase extends ConsumerWidget {
  const _StepBase();

  Widget body(BuildContext context, WidgetRef ref, WizardState s,
      WizardController c);

  String get title;
  String get subtitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final s = ref.watch(wizardControllerProvider);
    final c = ref.read(wizardControllerProvider.notifier);
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.xl, AppSpacing.lg, AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: theme.textTheme.headlineSmall),
          const SizedBox(height: AppSpacing.xs),
          Text(subtitle, style: theme.textTheme.bodyMedium),
          const SizedBox(height: AppSpacing.xl),
          body(context, ref, s, c),
        ],
      ),
    );
  }
}

class _StepObiettivo extends _StepBase {
  const _StepObiettivo();

  @override
  String get title => 'Qual è il tuo obiettivo?';
  @override
  String get subtitle =>
      'Aiuta il trainer a impostare il piano nella direzione giusta.';

  @override
  Widget body(BuildContext context, WidgetRef ref, WizardState s,
      WizardController c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final o in Obiettivo.values)
          RadioListTile<Obiettivo>(
            value: o,
            // ignore: deprecated_member_use
            groupValue: s.obiettivo,
            // ignore: deprecated_member_use
            onChanged: (v) => c.set((st) => st.copyWith(obiettivo: v)),
            title: Text(o.label),
            controlAffinity: ListTileControlAffinity.trailing,
            contentPadding: EdgeInsets.zero,
          ),
        const SizedBox(height: AppSpacing.lg),
        Row(children: [
          Expanded(
            child: TextFormField(
              initialValue: s.timeframeSettimane?.toString() ?? '',
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Settimane'),
              onChanged: (v) => c.set((st) =>
                  st.copyWith(timeframeSettimane: int.tryParse(v.trim()))),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: TextFormField(
              initialValue: s.pesoTargetKg ?? '',
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Peso target (kg)'),
              onChanged: (v) => c.set((st) => st.copyWith(
                  pesoTargetKg: v.trim().isEmpty ? null : v.trim())),
            ),
          ),
        ]),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          initialValue: s.motivazione ?? '',
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Cosa ti motiva? (opzionale)',
            alignLabelWithHint: true,
          ),
          onChanged: (v) => c.set((st) => st.copyWith(
              motivazione: v.trim().isEmpty ? null : v.trim())),
        ),
      ],
    );
  }
}

class _StepAlimentazione extends _StepBase {
  const _StepAlimentazione();

  @override
  String get title => 'Cosa mangi (e cosa no)';
  @override
  String get subtitle =>
      'Allergeni, intolleranze e preferenze ci aiutano a costruire un piano sostenibile.';

  static const _regimi = ['onnivoro', 'vegetariano', 'vegano', 'pescetariano', 'altro'];
  static const _commonAllergens = [
    'glutine', 'lattosio', 'frutta_secca', 'arachidi', 'uova',
    'pesce', 'crostacei', 'soia', 'sedano', 'senape',
  ];

  @override
  Widget body(BuildContext context, WidgetRef ref, WizardState s,
      WizardController c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<String>(
          initialValue: s.regimeAlimentare,
          decoration: const InputDecoration(labelText: 'Regime alimentare'),
          items: _regimi
              .map((r) => DropdownMenuItem(
                  value: r, child: Text(r[0].toUpperCase() + r.substring(1))))
              .toList(),
          onChanged: (v) => c.set((st) => st.copyWith(regimeAlimentare: v)),
        ),
        const SizedBox(height: AppSpacing.lg),
        _WizardChipGroup(
          label: 'Allergeni',
          values: s.allergeni,
          suggestions: _commonAllergens,
          onChanged: (list) => c.set((st) => st.copyWith(allergeni: list)),
          addHint: 'Allergene',
        ),
        const SizedBox(height: AppSpacing.lg),
        _WizardChipGroup(
          label: 'Intolleranze',
          values: s.intolleranze,
          onChanged: (list) => c.set((st) => st.copyWith(intolleranze: list)),
          addHint: 'Intolleranza',
        ),
        const SizedBox(height: AppSpacing.lg),
        _WizardChipGroup(
          label: 'Cibi preferiti',
          values: s.cibiPreferiti,
          onChanged: (list) => c.set((st) => st.copyWith(cibiPreferiti: list)),
          addHint: 'Cibo preferito',
        ),
        const SizedBox(height: AppSpacing.lg),
        _WizardChipGroup(
          label: 'Cibi da evitare',
          values: s.cibiEvitati,
          onChanged: (list) => c.set((st) => st.copyWith(cibiEvitati: list)),
          addHint: 'Cibo da evitare',
        ),
      ],
    );
  }
}

class _StepPreferenzePasti extends _StepBase {
  const _StepPreferenzePasti();

  @override
  String get title => 'Le tue abitudini ai pasti';
  @override
  String get subtitle =>
      'Quanti pasti fai e quando? Servono al trainer per pianificare gli orari.';

  @override
  Widget body(BuildContext context, WidgetRef ref, WizardState s,
      WizardController c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(children: [
          Expanded(
            child: TextFormField(
              initialValue: s.nPastiDie?.toString() ?? '',
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Pasti al giorno'),
              onChanged: (v) => c.set(
                  (st) => st.copyWith(nPastiDie: int.tryParse(v.trim()))),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: TextFormField(
              initialValue: s.occasioniSociali?.toString() ?? '',
              keyboardType: TextInputType.number,
              decoration:
                  const InputDecoration(labelText: 'Cene fuori/sett.'),
              onChanged: (v) => c.set((st) =>
                  st.copyWith(occasioniSociali: int.tryParse(v.trim()))),
            ),
          ),
        ]),
        const SizedBox(height: AppSpacing.lg),
        _WizardChipGroup(
          label: 'Orari abituali pasti',
          values: s.orariPasti,
          onChanged: (list) => c.set((st) => st.copyWith(orariPasti: list)),
          addHint: 'Orario (es. 08:00)',
          suggestions: const ['07:30', '12:30', '16:00', '20:00'],
        ),
      ],
    );
  }
}

class _StepLifestyle extends _StepBase {
  const _StepLifestyle();

  @override
  String get title => 'Stile di vita';
  @override
  String get subtitle => 'Sonno, idratazione e stress influenzano i risultati.';

  @override
  Widget body(BuildContext context, WidgetRef ref, WizardState s,
      WizardController c) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(children: [
          Expanded(
            child: TextFormField(
              initialValue: s.oreSonno?.toString() ?? '',
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Ore di sonno'),
              onChanged: (v) =>
                  c.set((st) => st.copyWith(oreSonno: int.tryParse(v.trim()))),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: TextFormField(
              initialValue: s.consumoAcquaLitri ?? '',
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Acqua (L/die)'),
              onChanged: (v) => c.set((st) => st.copyWith(
                  consumoAcquaLitri: v.trim().isEmpty ? null : v.trim())),
            ),
          ),
        ]),
        const SizedBox(height: AppSpacing.lg),
        Text(
          'Livello di stress: ${(s.livelloStress ?? 5)}/10',
          style: theme.textTheme.labelLarge,
        ),
        Slider(
          value: (s.livelloStress ?? 5).toDouble(),
          min: 1,
          max: 10,
          divisions: 9,
          label: '${s.livelloStress ?? 5}',
          onChanged: (v) =>
              c.set((st) => st.copyWith(livelloStress: v.round())),
        ),
        const SizedBox(height: AppSpacing.sm),
        DropdownButtonFormField<String>(
          initialValue: s.fumo,
          decoration: const InputDecoration(labelText: 'Fumo'),
          items: const [
            DropdownMenuItem(value: 'no', child: Text('Non fumo')),
            DropdownMenuItem(value: 'si', child: Text('Fumo')),
            DropdownMenuItem(value: 'ex', child: Text('Ex fumatore')),
          ],
          onChanged: (v) => c.set((st) => st.copyWith(fumo: v)),
        ),
      ],
    );
  }
}

class _StepMedico extends _StepBase {
  const _StepMedico();

  @override
  String get title => 'Storico medico (opzionale)';
  @override
  String get subtitle =>
      'Se hai patologie o farmaci, segnalalo qui. I dati sono cifrati.';

  @override
  Widget body(BuildContext context, WidgetRef ref, WizardState s,
      WizardController c) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: theme.colorScheme.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: theme.colorScheme.primary.withValues(alpha: 0.2),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.lock_outline, size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'I dati sanitari sono cifrati a riposo (GDPR art.9). Compilali solo se rilevanti.',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        TextFormField(
          initialValue: s.patologie ?? '',
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Patologie croniche',
            alignLabelWithHint: true,
          ),
          onChanged: (v) => c.set((st) => st.copyWith(
              patologie: v.trim().isEmpty ? null : v.trim())),
        ),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          initialValue: s.farmaci ?? '',
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Farmaci in uso',
            alignLabelWithHint: true,
          ),
          onChanged: (v) => c.set((st) => st.copyWith(
              farmaci: v.trim().isEmpty ? null : v.trim())),
        ),
        const SizedBox(height: AppSpacing.md),
        CheckboxListTile(
          value: s.acceptMedicalDisclaimer,
          onChanged: (v) => c.set(
              (st) => st.copyWith(acceptMedicalDisclaimer: v ?? false)),
          controlAffinity: ListTileControlAffinity.leading,
          title: Text(
            'Acconsento al trattamento dei dati sanitari per la finalità del piano alimentare (GDPR art.9).',
            style: theme.textTheme.bodySmall,
          ),
        ),
      ],
    );
  }
}

class _StepReview extends _StepBase {
  const _StepReview();

  @override
  String get title => 'Riepilogo';
  @override
  String get subtitle =>
      'Controlla i dati e invia. Riceverai una notifica quando il trainer prepara il piano.';

  Widget _kv(BuildContext context, String label, String? value) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label,
                style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.textTheme.bodySmall?.color
                        ?.withValues(alpha: 0.7))),
          ),
          Expanded(
            child: Text(value == null || value.isEmpty ? '—' : value,
                style: theme.textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }

  @override
  Widget body(BuildContext context, WidgetRef ref, WizardState s,
      WizardController c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _kv(context, 'Obiettivo', s.obiettivo?.label),
                _kv(context, 'Settimane',
                    s.timeframeSettimane?.toString()),
                _kv(context, 'Peso target',
                    s.pesoTargetKg != null ? '${s.pesoTargetKg} kg' : null),
                _kv(context, 'Regime', s.regimeAlimentare),
                _kv(context, 'Allergeni',
                    s.allergeni.isEmpty ? null : s.allergeni.join(', ')),
                _kv(
                    context,
                    'Intolleranze',
                    s.intolleranze.isEmpty
                        ? null
                        : s.intolleranze.join(', ')),
                _kv(context, 'Pasti/die', s.nPastiDie?.toString()),
                _kv(context, 'Sonno',
                    s.oreSonno != null ? '${s.oreSonno}h' : null),
                _kv(context, 'Stress',
                    s.livelloStress != null ? '${s.livelloStress}/10' : null),
                _kv(context, 'Fumo', s.fumo),
                _kv(context, 'Patologie',
                    s.patologie != null ? '••• (cifrate)' : null),
                _kv(context, 'Farmaci',
                    s.farmaci != null ? '••• (cifrati)' : null),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        TextFormField(
          initialValue: s.noteLibere ?? '',
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Note per il trainer (opzionale)',
            alignLabelWithHint: true,
          ),
          onChanged: (v) => c.set((st) => st.copyWith(
              noteLibere: v.trim().isEmpty ? null : v.trim())),
        ),
      ],
    );
  }
}

// ─────────────────────── Chip group helper ───────────────────────

class _WizardChipGroup extends StatefulWidget {
  const _WizardChipGroup({
    required this.label,
    required this.values,
    required this.onChanged,
    this.suggestions = const [],
    this.addHint = 'Aggiungi',
  });

  final String label;
  final List<String> values;
  final List<String> suggestions;
  final String addHint;
  final ValueChanged<List<String>> onChanged;

  @override
  State<_WizardChipGroup> createState() => _WizardChipGroupState();
}

class _WizardChipGroupState extends State<_WizardChipGroup> {
  Future<void> _addCustom() async {
    final ctrl = TextEditingController();
    final value = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(widget.addHint),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Scrivi…'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annulla')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
              child: const Text('OK')),
        ],
      ),
    );
    ctrl.dispose();
    if (value == null || value.isEmpty) return;
    if (widget.values.contains(value)) return;
    final next = [...widget.values, value];
    widget.onChanged(next);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label, style: theme.textTheme.labelLarge),
        const SizedBox(height: AppSpacing.sm),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final v in widget.values)
              InputChip(
                label: Text(v),
                onDeleted: () {
                  final next = [...widget.values]..remove(v);
                  widget.onChanged(next);
                },
              ),
            for (final s in widget.suggestions
                .where((s) => !widget.values.contains(s)))
              ActionChip(
                avatar: const Icon(Icons.add, size: 16),
                label: Text(s),
                onPressed: () => widget.onChanged([...widget.values, s]),
              ),
            ActionChip(
              avatar: const Icon(Icons.edit, size: 16),
              label: const Text('Personalizzato'),
              onPressed: _addCustom,
            ),
          ],
        ),
      ],
    );
  }
}
