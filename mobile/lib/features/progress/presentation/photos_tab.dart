import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../shared/utils/date_format_it.dart';
import '../data/progress_repository.dart';
import '../domain/progress_models.dart';

class PhotosTab extends ConsumerWidget {
  const PhotosTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncList = ref.watch(photosProvider);

    return Stack(
      children: [
        RefreshIndicator(
          onRefresh: () async => ref.invalidate(photosProvider),
          child: asyncList.when(
            loading: () => ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 100),
                Center(child: CircularProgressIndicator()),
              ],
            ),
            error: (e, _) => ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                const SizedBox(height: 80),
                _ErrorBlock(
                  message:
                      e is ApiException ? e.message : 'Errore di caricamento',
                  onRetry: () => ref.invalidate(photosProvider),
                ),
              ],
            ),
            data: (items) {
              if (items.isEmpty) {
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [_EmptyPhotosState()],
                );
              }
              final byType = <ProgressPhotoType, List<ProgressPhoto>>{};
              for (final p in items) {
                byType.putIfAbsent(p.type, () => []).add(p);
              }
              for (final list in byType.values) {
                list.sort((a, b) => b.date.compareTo(a.date));
              }

              return ListView(
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                children: [
                  for (final type in ProgressPhotoType.values)
                    if (byType[type] != null) ...[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(4, 8, 4, 8),
                        child: Text(
                          type.label.toUpperCase(),
                          style: Theme.of(context)
                              .textTheme
                              .labelMedium
                              ?.copyWith(letterSpacing: 0.6),
                        ),
                      ),
                      _PhotoGrid(photos: byType[type]!),
                      const SizedBox(height: 16),
                    ],
                ],
              );
            },
          ),
        ),
        Positioned(
          right: 16,
          bottom: 16 + MediaQuery.of(context).padding.bottom,
          child: FloatingActionButton.extended(
            heroTag: 'add-photo',
            onPressed: () => _pickAndUpload(context, ref),
            icon: const Icon(Icons.camera_alt_rounded),
            label: const Text('Foto progresso'),
          ),
        ),
      ],
    );
  }

  Future<void> _pickAndUpload(BuildContext context, WidgetRef ref) async {
    final type = await showModalBottomSheet<ProgressPhotoType>(
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
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Theme.of(ctx).dividerColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'Scegli inquadratura',
                style: Theme.of(ctx).textTheme.titleMedium,
              ),
            ),
            const SizedBox(height: 8),
            for (final t in ProgressPhotoType.values)
              ListTile(
                leading: Icon(_iconFor(t)),
                title: Text(t.label),
                onTap: () => Navigator.pop(ctx, t),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (type == null || !context.mounted) return;

    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.photo_camera_rounded),
              title: const Text('Scatta foto'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded),
              title: const Text('Scegli dalla galleria'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (source == null || !context.mounted) return;

    final picker = ImagePicker();
    final XFile? picked;
    try {
      picked = await picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Errore camera/galleria: $e')),
      );
      return;
    }
    if (picked == null || !context.mounted) return;

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    try {
      await ref.read(progressRepositoryProvider).uploadPhoto(
            file: File(picked.path),
            type: type,
            date: DateTime.now(),
          );
      if (!context.mounted) return;
      Navigator.of(context, rootNavigator: true).pop();
      ref.invalidate(photosProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Foto caricata!')),
      );
    } catch (e) {
      if (!context.mounted) return;
      Navigator.of(context, rootNavigator: true).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : 'Errore upload')),
      );
    }
  }

  IconData _iconFor(ProgressPhotoType t) {
    switch (t) {
      case ProgressPhotoType.front:
        return Icons.accessibility_new_rounded;
      case ProgressPhotoType.side:
        return Icons.directions_walk_rounded;
      case ProgressPhotoType.back:
        return Icons.flip_camera_ios_rounded;
    }
  }
}

class _PhotoGrid extends StatelessWidget {
  const _PhotoGrid({required this.photos});
  final List<ProgressPhoto> photos;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        childAspectRatio: 0.75,
      ),
      itemCount: photos.length,
      itemBuilder: (context, i) => _PhotoTile(photo: photos[i], all: photos, index: i),
    );
  }
}

class _PhotoTile extends ConsumerWidget {
  const _PhotoTile({required this.photo, required this.all, required this.index});
  final ProgressPhoto photo;
  final List<ProgressPhoto> all;
  final int index;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(progressRepositoryProvider);
    return FutureBuilder<String>(
      future: repo.getPhotoSignedUrl(photo.id),
      builder: (context, snapshot) {
        Widget content;
        if (snapshot.connectionState != ConnectionState.done) {
          content = Container(color: Theme.of(context).colorScheme.surfaceContainerHighest);
        } else if (snapshot.hasError || snapshot.data == null) {
          content = Container(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            alignment: Alignment.center,
            child: Icon(Icons.broken_image_rounded,
                color: Theme.of(context).textTheme.bodySmall?.color),
          );
        } else {
          content = Image.network(
            snapshot.data!,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => Container(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: const Icon(Icons.broken_image_rounded),
            ),
          );
        }
        return Hero(
          tag: 'photo-${photo.id}',
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadius.md),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => _PhotoCarousel(photos: all, initialIndex: index),
                  ),
                );
              },
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.md),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    content,
                    Positioned(
                      left: 6,
                      bottom: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.55),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          formatDateItShort(photo.date),
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppColors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _PhotoCarousel extends ConsumerStatefulWidget {
  const _PhotoCarousel({required this.photos, required this.initialIndex});
  final List<ProgressPhoto> photos;
  final int initialIndex;

  @override
  ConsumerState<_PhotoCarousel> createState() => _PhotoCarouselState();
}

class _PhotoCarouselState extends ConsumerState<_PhotoCarousel> {
  late final PageController _ctrl =
      PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Elimina foto'),
        content: const Text('Sei sicuro di voler eliminare questa foto?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annulla'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Elimina'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final photo = widget.photos[_index];
    try {
      await ref.read(progressRepositoryProvider).deletePhoto(photo.id);
      ref.invalidate(photosProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : 'Errore')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final photo = widget.photos[_index];
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: AppColors.white,
        title: Text(
          '${photo.type.label} · ${formatDateItShort(photo.date)}',
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded),
            onPressed: _delete,
          ),
        ],
      ),
      body: PageView.builder(
        controller: _ctrl,
        itemCount: widget.photos.length,
        onPageChanged: (i) => setState(() => _index = i),
        itemBuilder: (context, i) => _CarouselImage(photo: widget.photos[i]),
      ),
    );
  }
}

class _CarouselImage extends ConsumerWidget {
  const _CarouselImage({required this.photo});
  final ProgressPhoto photo;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(progressRepositoryProvider);
    return FutureBuilder<String>(
      future: repo.getPhotoSignedUrl(photo.id),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator(color: AppColors.white));
        }
        if (snapshot.hasError || snapshot.data == null) {
          return const Center(
            child: Icon(Icons.broken_image_rounded, color: AppColors.white, size: 64),
          );
        }
        return Hero(
          tag: 'photo-${photo.id}',
          child: InteractiveViewer(
            minScale: 1,
            maxScale: 4,
            child: Center(
              child: Image.network(
                snapshot.data!,
                fit: BoxFit.contain,
                loadingBuilder: (_, child, p) {
                  if (p == null) return child;
                  return const Center(
                    child: CircularProgressIndicator(color: AppColors.white),
                  );
                },
                errorBuilder: (_, _, _) => const Center(
                  child: Icon(Icons.broken_image_rounded,
                      color: AppColors.white, size: 64),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

// ───────────────────────────── Empty / Error ─────────────────────────────

class _EmptyPhotosState extends StatelessWidget {
  const _EmptyPhotosState();
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 80, 32, 32),
      child: Column(
        children: [
          Icon(
            Icons.photo_library_rounded,
            size: 64,
            color: theme.colorScheme.primary.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          Text('Nessuna foto', style: theme.textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(
            'Usa il bottone in basso per scattare o caricare una foto progresso (frontale, laterale o posteriore).',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

class _ErrorBlock extends StatelessWidget {
  const _ErrorBlock({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(Icons.cloud_off_rounded, size: 56, color: AppColors.danger),
          const SizedBox(height: 16),
          Text('Errore di caricamento', style: theme.textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(message,
              textAlign: TextAlign.center, style: theme.textTheme.bodyMedium),
          const SizedBox(height: 16),
          FilledButton.tonalIcon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Riprova'),
          ),
        ],
      ),
    );
  }
}
