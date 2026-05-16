import 'dart:async';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../shared/utils/date_format_it.dart';
import '../data/chat_repository.dart';

class ChatPage extends ConsumerStatefulWidget {
  const ChatPage({super.key});

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final TextEditingController _inputCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  final List<ChatMessage> _messages = [];
  final Map<int, String> _imageUrls = {};
  bool _loading = true;
  bool _sending = false;
  bool _uploading = false;
  String? _error;
  StreamSubscription<ChatMessage>? _sseSub;
  File? _pendingAttachment;
  String? _pendingAttachmentMime;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final repo = ref.read(chatRepositoryProvider);
    try {
      final initial = await repo.fetchMessages(limit: 80);
      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..addAll(initial);
        _loading = false;
      });
      _scheduleScrollToBottom();
      _prefetchImageUrls();
      // Avvia stream SSE da dopo l'ultimo id
      final lastId = initial.isEmpty ? 0 : initial.last.id;
      _sseSub = repo.streamNewMessages(afterId: lastId).listen((m) {
        if (!mounted) return;
        // Evita duplicati (se la mia POST + SSE arrivano entrambi)
        final exists = _messages.any((x) => x.id == m.id);
        if (exists) return;
        setState(() => _messages.add(m));
        _scheduleScrollToBottom();
        _prefetchImageUrls();
        // Mark read solo se il messaggio arriva dal trainer
        if (!m.isMine) {
          repo.markAsRead();
        }
      });
      // Marca come letti i messaggi già caricati
      repo.markAsRead();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.message : 'Errore di caricamento';
      });
    }
  }

  void _scheduleScrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollCtrl.hasClients) return;
      _scrollCtrl.animateTo(
        _scrollCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final text = _inputCtrl.text.trim();
    final attachment = _pendingAttachment;
    if ((text.isEmpty && attachment == null) || _sending) return;
    setState(() => _sending = true);
    try {
      final repo = ref.read(chatRepositoryProvider);
      String? r2Key;
      String? mimeType;

      if (attachment != null) {
        setState(() => _uploading = true);
        try {
          final mime = _pendingAttachmentMime ?? 'application/octet-stream';
          final filename = attachment.path.split(Platform.pathSeparator).last;
          final size = await attachment.length();
          final presign = await repo.presignAttachmentUpload(
            filename: filename,
            contentType: mime,
            sizeBytes: size,
          );
          await repo.uploadAttachmentFile(
            uploadUrl: presign.uploadUrl,
            headers: presign.headers,
            file: attachment,
          );
          r2Key = presign.r2Key;
          mimeType = mime;
        } finally {
          if (mounted) setState(() => _uploading = false);
        }
      }

      final msg = await repo.sendMessage(
        text,
        attachmentR2Key: r2Key,
        attachmentMimeType: mimeType,
      );
      if (!mounted) return;
      setState(() {
        _messages.add(msg);
        _inputCtrl.clear();
        _pendingAttachment = null;
        _pendingAttachmentMime = null;
      });
      _scheduleScrollToBottom();
      _prefetchImageUrls();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : 'Errore')),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pickAttachment() async {
    if (_sending || _uploading) return;
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_rounded),
              title: const Text('Scatta foto'),
              onTap: () => Navigator.of(ctx).pop('camera'),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded),
              title: const Text('Galleria'),
              onTap: () => Navigator.of(ctx).pop('gallery'),
            ),
            ListTile(
              leading: const Icon(Icons.attach_file_rounded),
              title: const Text('File (PDF, video)'),
              onTap: () => Navigator.of(ctx).pop('file'),
            ),
          ],
        ),
      ),
    );
    if (choice == null) return;

    try {
      if (choice == 'camera' || choice == 'gallery') {
        final picker = ImagePicker();
        final picked = await picker.pickImage(
          source: choice == 'camera'
              ? ImageSource.camera
              : ImageSource.gallery,
          imageQuality: 85,
          maxWidth: 2048,
        );
        if (picked == null) return;
        final file = File(picked.path);
        if (await file.length() > 25 * 1024 * 1024) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('File troppo grande (max 25MB)')),
          );
          return;
        }
        final mime = _guessMimeFromExt(picked.path) ?? 'image/jpeg';
        setState(() {
          _pendingAttachment = file;
          _pendingAttachmentMime = mime;
        });
      } else if (choice == 'file') {
        final res = await FilePicker.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['pdf', 'mp4', 'mov'],
          withData: false,
        );
        if (res == null || res.files.isEmpty) return;
        final picked = res.files.first;
        if (picked.path == null) return;
        final file = File(picked.path!);
        if (await file.length() > 25 * 1024 * 1024) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('File troppo grande (max 25MB)')),
          );
          return;
        }
        final mime = _guessMimeFromExt(picked.path!) ?? 'application/pdf';
        setState(() {
          _pendingAttachment = file;
          _pendingAttachmentMime = mime;
        });
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Errore selezione: $e')),
      );
    }
  }

  String? _guessMimeFromExt(String path) {
    final ext = path.toLowerCase().split('.').last;
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'heic':
        return 'image/heic';
      case 'heif':
        return 'image/heif';
      case 'pdf':
        return 'application/pdf';
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
    }
    return null;
  }

  Future<void> _prefetchImageUrls() async {
    final repo = ref.read(chatRepositoryProvider);
    final missing = _messages
        .where((m) =>
            m.attachmentR2Key != null &&
            (m.attachmentMimeType?.startsWith('image/') ?? false) &&
            !_imageUrls.containsKey(m.id))
        .toList();
    for (final m in missing) {
      try {
        final url = await repo.getAttachmentDownloadUrl(m.attachmentR2Key!);
        if (!mounted) return;
        setState(() => _imageUrls[m.id] = url);
      } catch (_) {
        // best-effort
      }
    }
  }

  Future<void> _openAttachment(String r2Key) async {
    try {
      final url = await ref
          .read(chatRepositoryProvider)
          .getAttachmentDownloadUrl(r2Key);
      final uri = Uri.parse(url);
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Impossibile aprire: $e')),
      );
    }
  }

  @override
  void dispose() {
    _sseSub?.cancel();
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat con il trainer'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: Column(
        children: [
          if (_loading)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_error != null)
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.cloud_off_rounded,
                        size: 48,
                        color: AppColors.danger,
                      ),
                      const SizedBox(height: 12),
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      FilledButton.tonalIcon(
                        onPressed: () {
                          setState(() {
                            _loading = true;
                            _error = null;
                          });
                          _bootstrap();
                        },
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('Riprova'),
                      ),
                    ],
                  ),
                ),
              ),
            )
          else if (_messages.isEmpty)
            const Expanded(child: _EmptyChat())
          else
            Expanded(
              child: ListView.builder(
                controller: _scrollCtrl,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                itemCount: _messages.length,
                itemBuilder: (context, i) {
                  final m = _messages[i];
                  final prev = i > 0 ? _messages[i - 1] : null;
                  final showDate = prev == null ||
                      !_sameDay(prev.createdAt, m.createdAt);
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (showDate) _DateSeparator(date: m.createdAt),
                      _MessageBubble(
                        message: m,
                        imageUrl: _imageUrls[m.id],
                        onOpenAttachment: _openAttachment,
                      ),
                    ],
                  );
                },
              ),
            ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                border: Border(
                  top: BorderSide(color: theme.colorScheme.outline),
                ),
              ),
              child: Column(
                children: [
                  if (_pendingAttachment != null)
                    _PendingAttachmentPreview(
                      file: _pendingAttachment!,
                      mimeType: _pendingAttachmentMime,
                      uploading: _uploading,
                      onRemove: () {
                        setState(() {
                          _pendingAttachment = null;
                          _pendingAttachmentMime = null;
                        });
                      },
                    ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.attach_file_rounded),
                        color: theme.colorScheme.primary,
                        onPressed: (_sending || _uploading)
                            ? null
                            : _pickAttachment,
                        tooltip: 'Allega',
                      ),
                      Expanded(
                        child: TextField(
                          controller: _inputCtrl,
                          minLines: 1,
                          maxLines: 5,
                          textInputAction: TextInputAction.newline,
                          enabled: !_uploading,
                          decoration: InputDecoration(
                            hintText: 'Scrivi un messaggio…',
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                            filled: true,
                            fillColor: theme.colorScheme.surfaceContainerHighest,
                            border: OutlineInputBorder(
                              borderSide: BorderSide.none,
                              borderRadius:
                                  BorderRadius.circular(AppRadius.pill),
                            ),
                          ),
                          onSubmitted: (_) => _send(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Material(
                        color: theme.colorScheme.primary,
                        shape: const CircleBorder(),
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: (_sending || _uploading) ? null : _send,
                          child: Container(
                            width: 44,
                            height: 44,
                            alignment: Alignment.center,
                            child: (_sending || _uploading)
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(
                                    Icons.send_rounded,
                                    color: Colors.white,
                                  ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static bool _sameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}

class _DateSeparator extends StatelessWidget {
  const _DateSeparator({required this.date});
  final DateTime date;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final today = DateTime.now();
    final yesterday = today.subtract(const Duration(days: 1));
    String label;
    if (_sameDay(date, today)) {
      label = 'Oggi';
    } else if (_sameDay(date, yesterday)) {
      label = 'Ieri';
    } else {
      label = formatDateItLong(date);
    }
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 10),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(AppRadius.pill),
        ),
        child: Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.textTheme.bodySmall?.color,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  static bool _sameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    this.imageUrl,
    required this.onOpenAttachment,
  });
  final ChatMessage message;
  final String? imageUrl;
  final Future<void> Function(String r2Key) onOpenAttachment;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mine = message.isMine;
    final hasAttachment = message.attachmentR2Key != null;
    final isImage = message.attachmentMimeType?.startsWith('image/') ?? false;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment:
            mine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!mine) ...[
            CircleAvatar(
              radius: 14,
              backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.15),
              child: Icon(
                Icons.person_rounded,
                size: 16,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.72,
              ),
              padding: EdgeInsets.fromLTRB(
                hasAttachment ? 6 : 14,
                hasAttachment ? 6 : 10,
                hasAttachment ? 6 : 14,
                10,
              ),
              decoration: BoxDecoration(
                color: mine
                    ? theme.colorScheme.primary
                    : theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(mine ? 16 : 4),
                  bottomRight: Radius.circular(mine ? 4 : 16),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (hasAttachment && isImage)
                    GestureDetector(
                      onTap: () =>
                          onOpenAttachment(message.attachmentR2Key!),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: imageUrl != null
                            ? Image.network(
                                imageUrl!,
                                fit: BoxFit.cover,
                                width: 220,
                                loadingBuilder: (c, child, p) =>
                                    p == null
                                        ? child
                                        : Container(
                                            width: 220,
                                            height: 160,
                                            alignment: Alignment.center,
                                            color: Colors.black12,
                                            child:
                                                const CircularProgressIndicator(
                                              strokeWidth: 2,
                                            ),
                                          ),
                                errorBuilder: (c, _, __) => Container(
                                  width: 220,
                                  height: 160,
                                  alignment: Alignment.center,
                                  color: Colors.black12,
                                  child: const Icon(
                                    Icons.broken_image_rounded,
                                  ),
                                ),
                              )
                            : Container(
                                width: 220,
                                height: 160,
                                alignment: Alignment.center,
                                color: Colors.black12,
                                child: const CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              ),
                      ),
                    ),
                  if (hasAttachment && !isImage)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(8, 2, 8, 4),
                      child: InkWell(
                        onTap: () =>
                            onOpenAttachment(message.attachmentR2Key!),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: mine
                                ? Colors.white.withValues(alpha: 0.15)
                                : Colors.black.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                _iconForMime(message.attachmentMimeType),
                                size: 18,
                                color: mine
                                    ? Colors.white
                                    : theme.colorScheme.primary,
                              ),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  _filenameFromKey(
                                    message.attachmentR2Key!,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: mine
                                        ? Colors.white
                                        : theme.colorScheme.onSurface,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Icon(
                                Icons.open_in_new_rounded,
                                size: 14,
                                color: mine
                                    ? Colors.white.withValues(alpha: 0.8)
                                    : theme.textTheme.bodySmall?.color,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  if (message.body.isNotEmpty)
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        hasAttachment ? 8 : 0,
                        hasAttachment ? 6 : 0,
                        hasAttachment ? 8 : 0,
                        0,
                      ),
                      child: Text(
                        message.body,
                        style: TextStyle(
                          color: mine
                              ? Colors.white
                              : theme.colorScheme.onSurface,
                          fontSize: 15,
                          height: 1.3,
                        ),
                      ),
                    ),
                  Padding(
                    padding: EdgeInsets.only(
                      left: hasAttachment ? 8 : 0,
                      right: hasAttachment ? 8 : 0,
                      top: 3,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          formatTimeIt(message.createdAt),
                          style: TextStyle(
                            fontSize: 10,
                            color: mine
                                ? Colors.white.withValues(alpha: 0.7)
                                : theme.textTheme.bodySmall?.color,
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                        if (mine) ...[
                          const SizedBox(width: 4),
                          Icon(
                            message.readAt != null
                                ? Icons.done_all_rounded
                                : Icons.done_rounded,
                            size: 12,
                            color: message.readAt != null
                                ? Colors.cyanAccent
                                : Colors.white.withValues(alpha: 0.7),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static IconData _iconForMime(String? mime) {
    if (mime == null) return Icons.insert_drive_file_rounded;
    if (mime.startsWith('video/')) return Icons.movie_outlined;
    if (mime == 'application/pdf') return Icons.picture_as_pdf_rounded;
    return Icons.insert_drive_file_rounded;
  }

  static String _filenameFromKey(String key) {
    final last = key.split('/').last;
    // Toglie il prefisso timestamp "1234567890_"
    return last.replaceFirst(RegExp(r'^\d+_'), '');
  }
}

class _PendingAttachmentPreview extends StatelessWidget {
  const _PendingAttachmentPreview({
    required this.file,
    required this.mimeType,
    required this.uploading,
    required this.onRemove,
  });
  final File file;
  final String? mimeType;
  final bool uploading;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isImage = mimeType?.startsWith('image/') ?? false;
    final filename = file.path.split(Platform.pathSeparator).last;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: isImage
                ? Image.file(file, width: 44, height: 44, fit: BoxFit.cover)
                : Container(
                    width: 44,
                    height: 44,
                    color: theme.colorScheme.primary.withValues(alpha: 0.15),
                    alignment: Alignment.center,
                    child: Icon(
                      _MessageBubble._iconForMime(mimeType),
                      color: theme.colorScheme.primary,
                    ),
                  ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  filename,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (uploading)
                  Text(
                    'Caricamento…',
                    style: theme.textTheme.bodySmall,
                  ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close_rounded),
            onPressed: uploading ? null : onRemove,
            tooltip: 'Rimuovi',
          ),
        ],
      ),
    );
  }
}

class _EmptyChat extends StatelessWidget {
  const _EmptyChat();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.chat_bubble_outline_rounded,
            size: 64,
            color: theme.colorScheme.primary.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          Text(
            'Inizia la conversazione',
            style: theme.textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Scrivi al tuo trainer per dubbi, feedback o aggiornamenti.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}
