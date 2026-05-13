import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../data/workouts_repository.dart';
import '../../domain/workout_models.dart';

/// Sezione UI riusabile per gestire gli allegati (foto/video) di un
/// esercizio loggato. Supporta sia il caso "exerciseLogId già noto"
/// (workout history) che "vai a risolverlo prima" (session player).
class ExerciseAttachmentsSection extends ConsumerStatefulWidget {
  const ExerciseAttachmentsSection({
    super.key,
    this.exerciseLogId,
    this.workoutLogId,
    this.templateExerciseId,
    this.initial = const [],
    this.ordine,
    this.compact = false,
  }) : assert(
          exerciseLogId != null ||
              (workoutLogId != null && templateExerciseId != null),
          'Serve exerciseLogId o (workoutLogId+templateExerciseId)',
        );

  /// Se noto: usalo direttamente.
  final int? exerciseLogId;

  /// Se exerciseLogId non è noto: serve la coppia (workoutLog, templateExercise)
  /// per risolvere/creare la riga lato server al primo upload.
  final int? workoutLogId;
  final int? templateExerciseId;
  final int? ordine;

  final List<WorkoutAttachment> initial;
  final bool compact;

  @override
  ConsumerState<ExerciseAttachmentsSection> createState() =>
      _ExerciseAttachmentsSectionState();
}

class _ExerciseAttachmentsSectionState
    extends ConsumerState<ExerciseAttachmentsSection> {
  late List<WorkoutAttachment> _attachments;
  int? _resolvedExerciseLogId;
  bool _uploading = false;
  String? _error;

  static const int _maxBytes = 50 * 1024 * 1024; // 50 MB

  @override
  void initState() {
    super.initState();
    _attachments = List.of(widget.initial);
    _resolvedExerciseLogId = widget.exerciseLogId;
  }

  Future<int> _ensureExerciseLogId() async {
    if (_resolvedExerciseLogId != null) return _resolvedExerciseLogId!;
    final id = await ref
        .read(workoutsRepositoryProvider)
        .resolveExerciseLogId(
          workoutLogId: widget.workoutLogId!,
          templateExerciseId: widget.templateExerciseId!,
          ordine: widget.ordine,
        );
    if (mounted) setState(() => _resolvedExerciseLogId = id);
    return id;
  }

  Future<void> _pickAndUpload(_PickKind kind) async {
    final picker = ImagePicker();
    try {
      XFile? file;
      if (kind == _PickKind.imageGallery) {
        file = await picker.pickImage(
          source: ImageSource.gallery,
          maxWidth: 1920,
          imageQuality: 85,
        );
      } else if (kind == _PickKind.imageCamera) {
        file = await picker.pickImage(
          source: ImageSource.camera,
          maxWidth: 1920,
          imageQuality: 85,
        );
      } else if (kind == _PickKind.videoGallery) {
        file = await picker.pickVideo(
          source: ImageSource.gallery,
          maxDuration: const Duration(minutes: 3),
        );
      } else {
        file = await picker.pickVideo(
          source: ImageSource.camera,
          maxDuration: const Duration(minutes: 2),
        );
      }
      if (file == null) return;

      final bytes = await file.readAsBytes();
      if (bytes.length > _maxBytes) {
        setState(() => _error =
            'File troppo grande (${(bytes.length / 1024 / 1024).toStringAsFixed(1)} MB, max 50 MB)');
        return;
      }

      final contentType = _detectContentType(file.path, bytes);
      if (contentType == null) {
        setState(() => _error = 'Formato file non supportato');
        return;
      }

      setState(() {
        _uploading = true;
        _error = null;
      });

      final exerciseLogId = await _ensureExerciseLogId();
      final id = await ref.read(workoutsRepositoryProvider).uploadAttachment(
            exerciseLogId: exerciseLogId,
            filename: file.name,
            contentType: contentType,
            bytes: bytes,
          );

      // Refetch list per avere il record completo
      final fresh = await ref
          .read(workoutsRepositoryProvider)
          .listAttachments(exerciseLogId);
      if (!mounted) return;
      setState(() {
        _attachments = fresh;
        _uploading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Allegato caricato (#$id)')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploading = false;
        _error = e is ApiException ? e.message : 'Errore upload';
      });
    }
  }

  String? _detectContentType(String path, Uint8List bytes) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic')) return 'image/heic';
    if (lower.endsWith('.heif')) return 'image/heif';
    if (lower.endsWith('.mp4')) return 'video/mp4';
    if (lower.endsWith('.mov') || lower.endsWith('.qt')) return 'video/quicktime';

    // Fallback su magic bytes per immagini
    if (bytes.length > 12) {
      if (bytes[0] == 0xFF && bytes[1] == 0xD8) return 'image/jpeg';
      if (bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E) {
        return 'image/png';
      }
    }
    return null;
  }

  Future<void> _delete(WorkoutAttachment a) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminare l\'allegato?'),
        content: const Text('Verrà rimosso definitivamente.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annulla'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.danger.withValues(alpha: 0.1),
              foregroundColor: AppColors.danger,
            ),
            child: const Text('Elimina'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(workoutsRepositoryProvider).deleteAttachment(a.id);
      if (!mounted) return;
      setState(() {
        _attachments = _attachments.where((x) => x.id != a.id).toList();
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Errore eliminazione'),
        ),
      );
    }
  }

  Future<void> _openAttachment(WorkoutAttachment a) async {
    final url = await ref
        .read(workoutsRepositoryProvider)
        .getAttachmentSignedUrl(a.r2Key);
    if (url == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossibile aprire l\'allegato')),
      );
      return;
    }
    final uri = Uri.parse(url);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  void _showPickerSheet() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Theme.of(ctx).dividerColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 12),
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded),
              title: const Text('Scatta foto'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndUpload(_PickKind.imageCamera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Foto dalla galleria'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndUpload(_PickKind.imageGallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.videocam_rounded),
              title: const Text('Registra video'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndUpload(_PickKind.videoCamera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.video_library_outlined),
              title: const Text('Video dalla galleria'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndUpload(_PickKind.videoGallery);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.attach_file_rounded,
              size: 16,
              color: theme.textTheme.bodySmall?.color,
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                'Allegati${_attachments.isNotEmpty ? ' (${_attachments.length})' : ''}',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            TextButton.icon(
              onPressed: _uploading ? null : _showPickerSheet,
              icon: _uploading
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 1.6),
                    )
                  : const Icon(Icons.add_a_photo_rounded, size: 16),
              label: const Text('Aggiungi'),
              style: TextButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              ),
            ),
          ],
        ),
        if (_error != null) ...[
          const SizedBox(height: 4),
          Text(
            _error!,
            style: TextStyle(fontSize: 12, color: AppColors.danger),
          ),
        ],
        const SizedBox(height: 8),
        if (_attachments.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest.withValues(
                alpha: 0.6,
              ),
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.image_outlined,
                  size: 18,
                  color: theme.textTheme.bodySmall?.color,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Nessun allegato. Aggiungi foto / video di form check, set massimale, note libere.',
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ],
            ),
          )
        else
          SizedBox(
            height: widget.compact ? 72 : 96,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _attachments.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (_, i) => _AttachmentTile(
                attachment: _attachments[i],
                onOpen: () => _openAttachment(_attachments[i]),
                onDelete: () => _delete(_attachments[i]),
                compact: widget.compact,
              ),
            ),
          ),
      ],
    );
  }
}

enum _PickKind { imageGallery, imageCamera, videoGallery, videoCamera }

class _AttachmentTile extends ConsumerStatefulWidget {
  const _AttachmentTile({
    required this.attachment,
    required this.onOpen,
    required this.onDelete,
    required this.compact,
  });

  final WorkoutAttachment attachment;
  final VoidCallback onOpen;
  final VoidCallback onDelete;
  final bool compact;

  @override
  ConsumerState<_AttachmentTile> createState() => _AttachmentTileState();
}

class _AttachmentTileState extends ConsumerState<_AttachmentTile> {
  String? _signedUrl;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.attachment.isImage) {
      _loadSignedUrl();
    }
  }

  Future<void> _loadSignedUrl() async {
    if (_loading) return;
    setState(() => _loading = true);
    final url = await ref
        .read(workoutsRepositoryProvider)
        .getAttachmentSignedUrl(widget.attachment.r2Key);
    if (!mounted) return;
    setState(() {
      _signedUrl = url;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = widget.compact ? 72.0 : 96.0;
    final isVideo = widget.attachment.isVideo;

    return GestureDetector(
      onTap: widget.onOpen,
      onLongPress: widget.onDelete,
      child: Stack(
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(AppRadius.sm),
              border: Border.all(color: theme.colorScheme.outline),
            ),
            clipBehavior: Clip.antiAlias,
            child: isVideo
                ? Center(
                    child: Icon(
                      Icons.play_circle_outline_rounded,
                      size: size * 0.45,
                      color: theme.colorScheme.primary,
                    ),
                  )
                : (_signedUrl == null
                    ? const Center(
                        child: SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 1.6),
                        ),
                      )
                    : Image.network(
                        _signedUrl!,
                        fit: BoxFit.cover,
                        width: size,
                        height: size,
                        errorBuilder: (_, _, _) =>
                            const Center(child: Icon(Icons.broken_image_outlined)),
                      )),
          ),
          Positioned(
            right: 2,
            top: 2,
            child: Material(
              color: Colors.black.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(20),
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: widget.onDelete,
                child: const Padding(
                  padding: EdgeInsets.all(3),
                  child: Icon(
                    Icons.close_rounded,
                    color: Colors.white,
                    size: 14,
                  ),
                ),
              ),
            ),
          ),
          if (isVideo)
            Positioned(
              left: 2,
              bottom: 2,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 4,
                  vertical: 1,
                ),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'VIDEO',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

