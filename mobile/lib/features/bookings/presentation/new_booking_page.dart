import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_radius.dart';
import '../../../shared/utils/date_format_it.dart';
import '../data/bookings_repository.dart';

class NewBookingPage extends ConsumerStatefulWidget {
  const NewBookingPage({super.key});

  @override
  ConsumerState<NewBookingPage> createState() => _NewBookingPageState();
}

class _NewBookingPageState extends ConsumerState<NewBookingPage> {
  AppointmentType? _type;
  DateTime _weekStart = _mondayOf(DateTime.now());
  DateTime? _selectedDay;
  BookingSlot? _selectedSlot;
  Future<List<AvailabilityDay>>? _slotsFuture;
  bool _submitting = false;

  static DateTime _mondayOf(DateTime d) {
    final pure = DateTime(d.year, d.month, d.day);
    final delta = (pure.weekday - 1) % 7;
    return pure.subtract(Duration(days: delta));
  }

  void _reloadSlots() {
    if (_type == null) {
      _slotsFuture = null;
      return;
    }
    final from = _weekStart;
    final to = from.add(const Duration(days: 6));
    _slotsFuture = ref
        .read(bookingsRepositoryProvider)
        .getSlots(from: from, to: to, durationMin: _type!.durataMinuti);
  }

  void _onTypeChanged(AppointmentType t) {
    setState(() {
      _type = t;
      _selectedDay = null;
      _selectedSlot = null;
      _reloadSlots();
    });
  }

  void _shiftWeek(int delta) {
    setState(() {
      _weekStart = _weekStart.add(Duration(days: 7 * delta));
      _selectedDay = null;
      _selectedSlot = null;
      _reloadSlots();
    });
  }

  Future<void> _book() async {
    if (_type == null || _selectedSlot == null) return;
    final note = await showModalBottomSheet<_BookConfirm?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _ConfirmSheet(
        type: _type!,
        slot: _selectedSlot!,
      ),
    );
    if (note == null || !mounted) return;

    setState(() => _submitting = true);
    try {
      await ref.read(bookingsRepositoryProvider).book(
        appointmentTypeId: _type!.id,
        startAt: _selectedSlot!.start,
        clienteNote: note.note,
        modalita: note.modalita,
      );
      ref.invalidate(myAppointmentsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Prenotazione inviata. Attendi conferma del trainer.'),
        ),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : 'Errore')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final typesAsync = ref.watch(appointmentTypesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Prenota una sessione'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton.icon(
            onPressed:
                _type == null || _selectedSlot == null || _submitting
                    ? null
                    : _book,
            icon: _submitting
                ? const SizedBox(
                    height: 16,
                    width: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.check_rounded),
            label: Text(
              _selectedSlot == null
                  ? 'Scegli uno slot'
                  : 'Prenota ${formatTimeIt(_selectedSlot!.start)}',
            ),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(50),
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SectionTitle(text: '1. Scegli la tipologia'),
            const SizedBox(height: 8),
            typesAsync.when(
              loading: () => const SizedBox(
                height: 100,
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Text(
                e is ApiException ? e.message : 'Errore caricamento tipologie',
                style: theme.textTheme.bodySmall,
              ),
              data: (types) {
                if (types.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: Text(
                      'Il tuo trainer non ha ancora pubblicato tipologie di sessione.',
                      style: theme.textTheme.bodyMedium,
                    ),
                  );
                }
                return Column(
                  children: types.map((t) {
                    final selected = _type?.id == t.id;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _TypeTile(
                        type: t,
                        selected: selected,
                        onTap: () => _onTypeChanged(t),
                      ),
                    );
                  }).toList(),
                );
              },
            ),
            if (_type != null) ...[
              const SizedBox(height: 18),
              _SectionTitle(text: '2. Scegli giorno e ora'),
              const SizedBox(height: 8),
              _WeekHeader(
                weekStart: _weekStart,
                onPrev: () => _shiftWeek(-1),
                onNext: () => _shiftWeek(1),
              ),
              const SizedBox(height: 12),
              FutureBuilder<List<AvailabilityDay>>(
                future: _slotsFuture,
                builder: (context, snap) {
                  if (snap.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  if (snap.hasError) {
                    return Text(
                      snap.error is ApiException
                          ? (snap.error as ApiException).message
                          : 'Errore caricamento slot',
                      style: theme.textTheme.bodySmall,
                    );
                  }
                  final days = snap.data ?? [];
                  return _DaysAndSlots(
                    weekStart: _weekStart,
                    days: days,
                    selectedDay: _selectedDay,
                    selectedSlot: _selectedSlot,
                    onDaySelected: (d) => setState(() {
                      _selectedDay = d;
                      _selectedSlot = null;
                    }),
                    onSlotSelected: (s) =>
                        setState(() => _selectedSlot = s),
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text(
      text,
      style: theme.textTheme.titleSmall?.copyWith(
        fontWeight: FontWeight.w800,
        color: theme.colorScheme.primary,
        letterSpacing: 0.4,
      ),
    );
  }
}

class _TypeTile extends StatelessWidget {
  const _TypeTile({
    required this.type,
    required this.selected,
    required this.onTap,
  });

  final AppointmentType type;
  final bool selected;
  final VoidCallback onTap;

  Color _color(BuildContext context) {
    try {
      return Color(int.parse(type.coloreHex.replaceFirst('#', '0xff')));
    } catch (_) {
      return Theme.of(context).colorScheme.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final c = _color(context);
    return Material(
      color: selected ? c.withValues(alpha: 0.10) : theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            border: Border.all(
              color: selected ? c : theme.colorScheme.outline,
              width: selected ? 1.5 : 1,
            ),
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          child: Row(
            children: [
              Container(
                width: 8,
                height: 40,
                decoration: BoxDecoration(
                  color: c,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      type.nome,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (type.descrizione != null &&
                        type.descrizione!.trim().isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        type.descrizione!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      children: [
                        _MiniChip(label: '${type.durataMinuti}min'),
                        _MiniChip(
                          label: type.modalita == 'in_presenza'
                              ? 'in presenza'
                              : type.modalita == 'online'
                                  ? 'online'
                                  : 'entrambi',
                        ),
                        if (type.prezzoFormatted != null)
                          _MiniChip(label: type.prezzoFormatted!),
                      ],
                    ),
                  ],
                ),
              ),
              if (selected)
                Icon(Icons.check_circle_rounded, color: c),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniChip extends StatelessWidget {
  const _MiniChip({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall,
      ),
    );
  }
}

class _WeekHeader extends StatelessWidget {
  const _WeekHeader({
    required this.weekStart,
    required this.onPrev,
    required this.onNext,
  });
  final DateTime weekStart;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final end = weekStart.add(const Duration(days: 6));
    return Row(
      children: [
        IconButton(
          icon: const Icon(Icons.chevron_left_rounded),
          onPressed: onPrev,
        ),
        Expanded(
          child: Center(
            child: Text(
              '${formatDateItShort(weekStart)} – ${formatDateItShort(end)}',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.chevron_right_rounded),
          onPressed: onNext,
        ),
      ],
    );
  }
}

class _DaysAndSlots extends StatelessWidget {
  const _DaysAndSlots({
    required this.weekStart,
    required this.days,
    required this.selectedDay,
    required this.selectedSlot,
    required this.onDaySelected,
    required this.onSlotSelected,
  });

  final DateTime weekStart;
  final List<AvailabilityDay> days;
  final DateTime? selectedDay;
  final BookingSlot? selectedSlot;
  final void Function(DateTime) onDaySelected;
  final void Function(BookingSlot) onSlotSelected;

  String _iso(DateTime d) {
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dayByIso = {for (final d in days) _iso(d.date): d};
    const labels = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: List.generate(7, (i) {
            final d = weekStart.add(Duration(days: i));
            final iso = _iso(d);
            final hasSlots = dayByIso[iso]?.slots.isNotEmpty ?? false;
            final selected =
                selectedDay != null && _iso(selectedDay!) == iso;
            final isPast = DateTime(d.year, d.month, d.day).isBefore(
              DateTime(
                DateTime.now().year,
                DateTime.now().month,
                DateTime.now().day,
              ),
            );
            final enabled = hasSlots && !isPast;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: InkWell(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  onTap: enabled ? () => onDaySelected(d) : null,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: selected
                          ? theme.colorScheme.primary
                          : enabled
                              ? theme.colorScheme.surface
                              : theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(
                        color: selected
                            ? theme.colorScheme.primary
                            : theme.colorScheme.outline,
                      ),
                    ),
                    child: Column(
                      children: [
                        Text(
                          labels[i],
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: selected
                                ? Colors.white
                                : enabled
                                    ? theme.colorScheme.primary
                                    : theme.colorScheme.outline,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${d.day}',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: selected
                                ? Colors.white
                                : enabled
                                    ? theme.colorScheme.onSurface
                                    : theme.colorScheme.outline,
                          ),
                        ),
                        const SizedBox(height: 4),
                        if (hasSlots && !selected)
                          Container(
                            height: 4,
                            width: 4,
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary,
                              shape: BoxShape.circle,
                            ),
                          )
                        else
                          const SizedBox(height: 4),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 16),
        if (selectedDay != null)
          _SlotsList(
            slots: dayByIso[_iso(selectedDay!)]?.slots ?? const [],
            selected: selectedSlot,
            onSelected: onSlotSelected,
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Text(
              'Seleziona un giorno disponibile',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall,
            ),
          ),
      ],
    );
  }
}

class _SlotsList extends StatelessWidget {
  const _SlotsList({
    required this.slots,
    required this.selected,
    required this.onSelected,
  });

  final List<BookingSlot> slots;
  final BookingSlot? selected;
  final void Function(BookingSlot) onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (slots.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Text(
          'Nessuno slot disponibile in questo giorno',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodySmall,
        ),
      );
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: slots.map((s) {
        final sel = selected != null && selected!.start == s.start;
        return InkWell(
          onTap: () => onSelected(s),
          borderRadius: BorderRadius.circular(AppRadius.pill),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: sel
                  ? theme.colorScheme.primary
                  : theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(AppRadius.pill),
              border: Border.all(
                color: sel
                    ? theme.colorScheme.primary
                    : theme.colorScheme.outline,
              ),
            ),
            child: Text(
              formatTimeIt(s.start),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: sel ? Colors.white : theme.colorScheme.onSurface,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _BookConfirm {
  const _BookConfirm({required this.note, this.modalita});
  final String note;
  final String? modalita;
}

class _ConfirmSheet extends StatefulWidget {
  const _ConfirmSheet({required this.type, required this.slot});
  final AppointmentType type;
  final BookingSlot slot;

  @override
  State<_ConfirmSheet> createState() => _ConfirmSheetState();
}

class _ConfirmSheetState extends State<_ConfirmSheet> {
  final _noteCtrl = TextEditingController();
  String _modalita = 'in_presenza';

  @override
  void initState() {
    super.initState();
    _modalita = widget.type.modalita == 'online' ? 'online' : 'in_presenza';
  }

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final showModalitaToggle = widget.type.modalita == 'entrambi';
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
            Text(
              'Conferma prenotazione',
              style: theme.textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            _SummaryRow(
              icon: Icons.calendar_today_rounded,
              text: formatDateItLong(widget.slot.start),
            ),
            _SummaryRow(
              icon: Icons.schedule_rounded,
              text:
                  '${formatTimeIt(widget.slot.start)} – ${formatTimeIt(widget.slot.end)} (${widget.type.durataMinuti}min)',
            ),
            _SummaryRow(
              icon: Icons.fitness_center_rounded,
              text: widget.type.nome,
            ),
            if (widget.type.prezzoFormatted != null)
              _SummaryRow(
                icon: Icons.euro_rounded,
                text: widget.type.prezzoFormatted!,
              ),
            if (showModalitaToggle) ...[
              const SizedBox(height: 14),
              Text(
                'Modalità',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                    value: 'in_presenza',
                    label: Text('In presenza'),
                    icon: Icon(Icons.place_outlined),
                  ),
                  ButtonSegment(
                    value: 'online',
                    label: Text('Online'),
                    icon: Icon(Icons.videocam_outlined),
                  ),
                ],
                selected: {_modalita},
                onSelectionChanged: (s) =>
                    setState(() => _modalita = s.first),
              ),
            ],
            const SizedBox(height: 16),
            TextField(
              controller: _noteCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'Nota per il trainer (opzionale)',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
              ),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).pop(
                _BookConfirm(
                  note: _noteCtrl.text.trim(),
                  modalita: showModalitaToggle ? _modalita : null,
                ),
              ),
              icon: const Icon(Icons.check_rounded),
              label: const Text('Invia richiesta'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Annulla'),
            ),
            const SizedBox(height: 8),
            Text(
              'La prenotazione resterà in attesa fino alla conferma del trainer.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Icon(icon, size: 16, color: theme.colorScheme.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: theme.textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}
