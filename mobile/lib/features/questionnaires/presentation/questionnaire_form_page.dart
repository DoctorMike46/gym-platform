import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../data/questionnaires_repository.dart';

class QuestionnaireFormPage extends ConsumerStatefulWidget {
  const QuestionnaireFormPage({super.key, required this.assignmentId});
  final int assignmentId;

  @override
  ConsumerState<QuestionnaireFormPage> createState() =>
      _QuestionnaireFormPageState();
}

class _QuestionnaireFormPageState
    extends ConsumerState<QuestionnaireFormPage> {
  QuestionnaireDetail? _detail;
  String? _error;
  bool _loading = true;
  bool _submitting = false;
  final Map<String, dynamic> _answers = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await ref
          .read(questionnairesRepositoryProvider)
          .getDetail(widget.assignmentId);
      if (!mounted) return;
      setState(() {
        _detail = d;
        if (d.existingAnswers != null) {
          _answers.addAll(d.existingAnswers!);
        }
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e is ApiException ? e.message : 'Errore di caricamento';
        _loading = false;
      });
    }
  }

  Future<void> _submit() async {
    final d = _detail;
    if (d == null) return;
    // Validazione required
    for (final q in d.schema.questions) {
      if (!q.required) continue;
      final v = _answers[q.id];
      final empty = v == null ||
          v == '' ||
          (v is List && v.isEmpty) ||
          (q.type == QuestionType.confirm && v != true);
      if (empty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Compila: ${q.label}')),
        );
        return;
      }
    }
    setState(() => _submitting = true);
    try {
      await ref
          .read(questionnairesRepositoryProvider)
          .submit(widget.assignmentId, _answers);
      ref.invalidate(pendingQuestionnairesProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Questionario inviato. Grazie!')),
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

    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null || _detail == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.cloud_off_rounded, size: 48, color: AppColors.danger),
                const SizedBox(height: 12),
                Text(_error ?? 'Errore', textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton.tonalIcon(
                  onPressed: () {
                    setState(() {
                      _loading = true;
                      _error = null;
                    });
                    _load();
                  },
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Riprova'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final d = _detail!;
    final readOnly = d.status != 'pending';
    final sections = d.schema.sections;

    return Scaffold(
      appBar: AppBar(
        title: Text(d.nome, overflow: TextOverflow.ellipsis),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      bottomNavigationBar: readOnly
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: FilledButton.icon(
                  onPressed: _submitting ? null : _submit,
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
                  label: Text(_submitting
                      ? 'Invio…'
                      : 'Invia questionario'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                  ),
                ),
              ),
            ),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          if (d.descrizione != null && d.descrizione!.trim().isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                d.descrizione!,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.textTheme.bodySmall?.color,
                ),
              ),
            ),
          if (d.motivo != null && d.motivo!.trim().isNotEmpty)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(
                  color: theme.colorScheme.primary.withValues(alpha: 0.20),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.info_outline_rounded,
                    size: 16,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      d.motivo!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          if (readOnly)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.check_circle_outline_rounded,
                    size: 16,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Questionario già inviato (sola lettura)',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          if (sections != null && sections.isNotEmpty)
            for (final sec in sections) ...[
              Padding(
                padding: const EdgeInsets.only(top: 20, bottom: 12),
                child: Text(
                  sec.title.toUpperCase(),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: theme.colorScheme.primary,
                    letterSpacing: 0.6,
                  ),
                ),
              ),
              ...sec.questionIds
                  .map((qid) {
                    final q = d.schema.questions.firstWhere(
                      (x) => x.id == qid,
                      orElse: () => const QuestionDef(
                        id: '',
                        type: QuestionType.text,
                        label: '',
                        required: false,
                      ),
                    );
                    if (q.id.isEmpty) return null;
                    return _QuestionField(
                      key: ValueKey('q-${q.id}'),
                      assignmentId: widget.assignmentId,
                      question: q,
                      value: _answers[q.id],
                      readOnly: readOnly,
                      onChanged: (v) => setState(() => _answers[q.id] = v),
                    );
                  })
                  .whereType<Widget>(),
            ]
          else
            for (final q in d.schema.questions)
              _QuestionField(
                key: ValueKey('q-${q.id}'),
                assignmentId: widget.assignmentId,
                question: q,
                value: _answers[q.id],
                readOnly: readOnly,
                onChanged: (v) => setState(() => _answers[q.id] = v),
              ),
        ],
      ),
    );
  }
}

class _QuestionField extends StatelessWidget {
  const _QuestionField({
    super.key,
    required this.assignmentId,
    required this.question,
    required this.value,
    required this.readOnly,
    required this.onChanged,
  });

  final int assignmentId;
  final QuestionDef question;
  final dynamic value;
  final bool readOnly;
  final void Function(dynamic) onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  question.label,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (question.required)
                Text(
                  '*',
                  style: TextStyle(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
            ],
          ),
          if (question.hint != null && question.hint!.trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              question.hint!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.textTheme.bodySmall?.color,
              ),
            ),
          ],
          const SizedBox(height: 10),
          _buildInput(context),
        ],
      ),
    );
  }

  Widget _buildInput(BuildContext context) {
    final theme = Theme.of(context);
    switch (question.type) {
      case QuestionType.text:
        return TextFormField(
          initialValue: value?.toString(),
          readOnly: readOnly,
          decoration: const InputDecoration(
            hintText: 'Inserisci valore',
            border: OutlineInputBorder(),
          ),
          onChanged: (v) => onChanged(v),
        );
      case QuestionType.textarea:
        return TextFormField(
          initialValue: value?.toString(),
          readOnly: readOnly,
          minLines: 3,
          maxLines: 6,
          decoration: const InputDecoration(
            hintText: 'Inserisci valore',
            border: OutlineInputBorder(),
          ),
          onChanged: (v) => onChanged(v),
        );
      case QuestionType.number:
        return TextFormField(
          initialValue: value?.toString(),
          readOnly: readOnly,
          keyboardType:
              const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            hintText: 'Inserisci numero',
            border: OutlineInputBorder(),
          ),
          onChanged: (v) {
            final n = double.tryParse(v.replaceAll(',', '.'));
            onChanged(n);
          },
        );
      case QuestionType.radio:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: (question.options ?? []).map((opt) {
            final selected = value == opt;
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: InkWell(
                onTap: readOnly ? null : () => onChanged(opt),
                borderRadius: BorderRadius.circular(AppRadius.md),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: selected
                        ? theme.colorScheme.primary.withValues(alpha: 0.10)
                        : theme.colorScheme.surface,
                    border: Border.all(
                      color: selected
                          ? theme.colorScheme.primary
                          : theme.colorScheme.outline,
                      width: selected ? 1.5 : 1,
                    ),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        selected
                            ? Icons.radio_button_checked
                            : Icons.radio_button_off,
                        size: 18,
                        color: selected
                            ? theme.colorScheme.primary
                            : theme.textTheme.bodySmall?.color,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          opt,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight:
                                selected ? FontWeight.w700 : FontWeight.w400,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        );
      case QuestionType.checkbox:
        final selected =
            (value is List) ? (value as List).cast<String>() : <String>[];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: (question.options ?? []).map((opt) {
            final checked = selected.contains(opt);
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: InkWell(
                onTap: readOnly
                    ? null
                    : () {
                        final next = List<String>.from(selected);
                        if (checked) {
                          next.remove(opt);
                        } else {
                          next.add(opt);
                        }
                        onChanged(next);
                      },
                borderRadius: BorderRadius.circular(AppRadius.md),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    border:
                        Border.all(color: theme.colorScheme.outline),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        checked
                            ? Icons.check_box_rounded
                            : Icons.check_box_outline_blank_rounded,
                        size: 18,
                        color: checked
                            ? theme.colorScheme.primary
                            : theme.textTheme.bodySmall?.color,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(opt, style: theme.textTheme.bodyMedium),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        );
      case QuestionType.scale:
        final min = question.min ?? 1;
        final max = question.max ?? 10;
        final current = (value is num) ? (value as num).toInt() : null;
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(max - min + 1, (i) {
            final n = min + i;
            final selected = current == n;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 1),
                child: InkWell(
                  onTap: readOnly ? null : () => onChanged(n),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: Container(
                      decoration: BoxDecoration(
                        color: selected
                            ? theme.colorScheme.primary
                            : theme.colorScheme.surface,
                        border: Border.all(
                          color: selected
                              ? theme.colorScheme.primary
                              : theme.colorScheme.outline,
                        ),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '$n',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: selected
                              ? Colors.white
                              : theme.colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        );
      case QuestionType.confirm:
        final confirmed = value == true;
        return InkWell(
          onTap: readOnly ? null : () => onChanged(!confirmed),
          borderRadius: BorderRadius.circular(AppRadius.md),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: confirmed
                  ? theme.colorScheme.primary.withValues(alpha: 0.10)
                  : theme.colorScheme.surface,
              border: Border.all(
                color: confirmed
                    ? theme.colorScheme.primary
                    : theme.colorScheme.outline,
                width: confirmed ? 1.5 : 1,
              ),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Row(
              children: [
                Icon(
                  confirmed
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_off,
                  color: confirmed
                      ? theme.colorScheme.primary
                      : theme.textTheme.bodySmall?.color,
                ),
                const SizedBox(width: 10),
                Text(
                  'Ho capito',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: confirmed ? FontWeight.w800 : FontWeight.w400,
                    color: confirmed
                        ? theme.colorScheme.primary
                        : null,
                  ),
                ),
              ],
            ),
          ),
        );
      case QuestionType.upload:
        return _UploadField(
          assignmentId: assignmentId,
          questionId: question.id,
          value: value is String ? value : null,
          readOnly: readOnly,
          onChanged: onChanged,
        );
    }
  }
}

class _UploadField extends ConsumerStatefulWidget {
  const _UploadField({
    required this.assignmentId,
    required this.questionId,
    required this.value,
    required this.readOnly,
    required this.onChanged,
  });

  final int assignmentId;
  final String questionId;
  final String? value;
  final bool readOnly;
  final void Function(dynamic) onChanged;

  @override
  ConsumerState<_UploadField> createState() => _UploadFieldState();
}

class _UploadFieldState extends ConsumerState<_UploadField> {
  bool _uploading = false;
  String? _error;
  String? _previewUrl;
  bool _previewLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.value != null) {
      _loadPreview(widget.value!);
    }
  }

  @override
  void didUpdateWidget(covariant _UploadField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != oldWidget.value) {
      if (widget.value == null) {
        setState(() => _previewUrl = null);
      } else {
        _loadPreview(widget.value!);
      }
    }
  }

  Future<void> _loadPreview(String r2Key) async {
    setState(() => _previewLoading = true);
    try {
      final repo = ref.read(questionnairesRepositoryProvider);
      final url = await repo.getAttachmentSignedUrl(r2Key);
      if (!mounted) return;
      setState(() {
        _previewUrl = url;
        _previewLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _previewLoading = false);
    }
  }

  Future<void> _pickFromGallery() => _pick(ImageSource.gallery);
  Future<void> _pickFromCamera() => _pick(ImageSource.camera);

  Future<void> _pick(ImageSource source) async {
    setState(() {
      _uploading = true;
      _error = null;
    });
    try {
      final picker = ImagePicker();
      final image = await picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 82,
      );
      if (image == null) {
        setState(() => _uploading = false);
        return;
      }
      final bytes = await image.readAsBytes();
      if (bytes.length > 8 * 1024 * 1024) {
        setState(() {
          _uploading = false;
          _error = 'Foto troppo grande (max 8MB)';
        });
        return;
      }
      final lower = image.name.toLowerCase();
      String contentType = 'image/jpeg';
      if (lower.endsWith('.png')) {
        contentType = 'image/png';
      } else if (lower.endsWith('.webp')) {
        contentType = 'image/webp';
      } else if (lower.endsWith('.heic')) {
        contentType = 'image/heic';
      } else if (lower.endsWith('.heif')) {
        contentType = 'image/heif';
      }

      final repo = ref.read(questionnairesRepositoryProvider);
      final r2Key = await repo.uploadAttachment(
        assignmentId: widget.assignmentId,
        questionId: widget.questionId,
        filename: image.name,
        contentType: contentType,
        bytes: bytes,
      );
      widget.onChanged(r2Key);
      // _loadPreview verrà chiamato da didUpdateWidget
    } catch (e) {
      setState(() {
        _error = e is ApiException ? e.message : 'Errore upload';
      });
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasValue = widget.value != null;

    if (hasValue) {
      // Preview + bottone rimuovi
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: theme.colorScheme.outline),
            ),
            clipBehavior: Clip.antiAlias,
            child: AspectRatio(
              aspectRatio: 4 / 5,
              child: _previewLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _previewUrl != null
                      ? Image.network(
                          _previewUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => Center(
                            child: Icon(
                              Icons.image_not_supported_outlined,
                              size: 36,
                              color: theme.textTheme.bodySmall?.color,
                            ),
                          ),
                        )
                      : Center(
                          child: Icon(
                            Icons.check_circle_rounded,
                            size: 36,
                            color: theme.colorScheme.primary,
                          ),
                        ),
            ),
          ),
          const SizedBox(height: 8),
          if (!widget.readOnly)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _uploading ? null : _pickFromGallery,
                    icon: const Icon(Icons.image_outlined, size: 16),
                    label: const Text('Cambia'),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.outlined(
                  onPressed: _uploading
                      ? null
                      : () {
                          widget.onChanged(null);
                          setState(() {
                            _previewUrl = null;
                            _error = null;
                          });
                        },
                  icon: Icon(Icons.delete_outline, color: AppColors.danger),
                ),
              ],
            ),
        ],
      );
    }

    if (widget.readOnly) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: theme.colorScheme.outline),
        ),
        child: Text(
          'Nessun allegato caricato',
          style: theme.textTheme.bodySmall,
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _uploading ? null : _pickFromCamera,
                icon: const Icon(Icons.camera_alt_outlined, size: 16),
                label: const Text('Foto'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _uploading ? null : _pickFromGallery,
                icon: const Icon(Icons.photo_library_outlined, size: 16),
                label: const Text('Galleria'),
              ),
            ),
          ],
        ),
        if (_uploading) ...[
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 10),
              Text(
                'Caricamento…',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(
            _error!,
            style: theme.textTheme.bodySmall?.copyWith(color: AppColors.danger),
          ),
        ],
      ],
    );
  }
}
