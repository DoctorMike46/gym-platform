import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/injuries_repository.dart';
import '../domain/client_injury.dart';

class InjuriesPage extends ConsumerWidget {
  const InjuriesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final async = ref.watch(injuriesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Infortuni')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddSheet(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Aggiungi'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Text(
              'Errore: ${e is ApiException ? e.message : e.toString()}',
              textAlign: TextAlign.center,
            ),
          ),
        ),
        data: (injuries) {
          final active = injuries.where((i) => i.isActive).toList();
          final recovered = injuries.where((i) => !i.isActive).toList();

          if (injuries.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(injuriesProvider),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  const SizedBox(height: 80),
                  Icon(Icons.healing_outlined, size: 64, color: theme.disabledColor),
                  const SizedBox(height: AppSpacing.lg),
                  Center(
                    child: Text(
                      'Nessun infortunio registrato',
                      style: theme.textTheme.titleMedium,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                      child: Text(
                        'Aggiungi eventuali infortuni passati o attivi: il tuo trainer ne terrà conto nella programmazione.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(injuriesProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, 96),
              children: [
                if (active.isNotEmpty) ...[
                  Text('Attivi', style: theme.textTheme.titleSmall),
                  const SizedBox(height: AppSpacing.sm),
                  for (final i in active)
                    _InjuryTile(injury: i),
                  const SizedBox(height: AppSpacing.lg),
                ],
                if (recovered.isNotEmpty) ...[
                  Text('Recuperati', style: theme.textTheme.titleSmall),
                  const SizedBox(height: AppSpacing.sm),
                  for (final i in recovered)
                    _InjuryTile(injury: i),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  void _showAddSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: false,
      builder: (_) => const _AddInjurySheet(),
    );
  }
}

class _InjuryTile extends ConsumerWidget {
  const _InjuryTile({required this.injury});
  final ClientInjury injury;

  Color _gravityColor(BuildContext ctx) {
    switch (injury.gravita) {
      case InjuryGravita.grave:
        return Colors.red.shade700;
      case InjuryGravita.media:
        return Colors.orange.shade700;
      case InjuryGravita.leggera:
        return Colors.amber.shade700;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    injury.parteCorpo.label,
                    style: theme.textTheme.titleMedium,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: _gravityColor(context).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    injury.gravita.label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: _gravityColor(context),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            if (injury.tipo != null || injury.dataEvento != null) ...[
              const SizedBox(height: 4),
              Text(
                [
                  if (injury.tipo != null) injury.tipo!.label,
                  if (injury.dataEvento != null) 'dal ${injury.dataEvento}',
                ].join(' · '),
                style: theme.textTheme.bodySmall,
              ),
            ],
            if (injury.note != null && injury.note!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(injury.note!, style: theme.textTheme.bodyMedium),
            ],
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                if (injury.isActive)
                  TextButton.icon(
                    onPressed: () => _markRecovered(context, ref),
                    icon: const Icon(Icons.check_circle_outline, size: 16),
                    label: const Text('Recuperato'),
                  ),
                const Spacer(),
                IconButton(
                  onPressed: () => _confirmDelete(context, ref),
                  icon: const Icon(Icons.delete_outline),
                  color: theme.colorScheme.error,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _markRecovered(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(injuriesRepositoryProvider).update(
            injury.id,
            stato: InjuryStato.recuperato,
          );
      ref.invalidate(injuriesProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Segnato come recuperato')),
      );
    } on ApiException catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminare l\'infortunio?'),
        content: const Text('Questa azione è irreversibile.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annulla')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Elimina'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(injuriesRepositoryProvider).delete(injury.id);
      ref.invalidate(injuriesProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Infortunio eliminato')),
      );
    } on ApiException catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }
}

class _AddInjurySheet extends ConsumerStatefulWidget {
  const _AddInjurySheet();

  @override
  ConsumerState<_AddInjurySheet> createState() => _AddInjurySheetState();
}

class _AddInjurySheetState extends ConsumerState<_AddInjurySheet> {
  BodyPart? _parte;
  InjuryType? _tipo;
  InjuryGravita? _gravita;
  DateTime? _dataEvento;
  final _note = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(1990),
      lastDate: DateTime.now(),
      initialDate: _dataEvento ?? DateTime.now(),
    );
    if (picked != null) setState(() => _dataEvento = picked);
  }

  Future<void> _save() async {
    if (_parte == null || _gravita == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Seleziona parte e gravità')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(injuriesRepositoryProvider).create(
            parteCorpo: _parte!,
            tipo: _tipo,
            gravita: _gravita!,
            dataEvento: _dataEvento?.toIso8601String().substring(0, 10),
            note: _note.text.trim().isEmpty ? null : _note.text.trim(),
          );
      ref.invalidate(injuriesProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Infortunio aggiunto')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
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
            const SizedBox(height: AppSpacing.lg),
            Text('Aggiungi infortunio', style: theme.textTheme.headlineSmall),
            const SizedBox(height: AppSpacing.lg),
            DropdownButtonFormField<BodyPart>(
              initialValue: _parte,
              decoration: const InputDecoration(labelText: 'Parte del corpo'),
              items: BodyPart.values
                  .map((p) => DropdownMenuItem(value: p, child: Text(p.label)))
                  .toList(),
              onChanged: (v) => setState(() => _parte = v),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(children: [
              Expanded(
                child: DropdownButtonFormField<InjuryType>(
                  initialValue: _tipo,
                  decoration: const InputDecoration(labelText: 'Tipo'),
                  items: InjuryType.values
                      .map((t) => DropdownMenuItem(value: t, child: Text(t.label)))
                      .toList(),
                  onChanged: (v) => setState(() => _tipo = v),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: DropdownButtonFormField<InjuryGravita>(
                  initialValue: _gravita,
                  decoration: const InputDecoration(labelText: 'Gravità'),
                  items: InjuryGravita.values
                      .map((g) => DropdownMenuItem(value: g, child: Text(g.label)))
                      .toList(),
                  onChanged: (v) => setState(() => _gravita = v),
                ),
              ),
            ]),
            const SizedBox(height: AppSpacing.md),
            InkWell(
              onTap: _pickDate,
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Data evento',
                  suffixIcon: Icon(Icons.calendar_today, size: 18),
                ),
                child: Text(
                  _dataEvento != null
                      ? '${_dataEvento!.day.toString().padLeft(2, '0')}/${_dataEvento!.month.toString().padLeft(2, '0')}/${_dataEvento!.year}'
                      : 'Seleziona…',
                  style: _dataEvento == null
                      ? TextStyle(color: theme.hintColor)
                      : null,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            TextField(
              controller: _note,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Note (cifrate)',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            PrimaryButton(
              label: 'Aggiungi',
              icon: Icons.add,
              onPressed: _saving ? null : _save,
              loading: _saving,
            ),
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
