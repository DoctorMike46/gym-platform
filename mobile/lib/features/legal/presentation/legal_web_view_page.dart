import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../core/config/env.dart';

/// Apre una pagina legale del backend (privacy/ToS) dentro l'app, con AppBar
/// nativa e back arrow. Niente browser esterno.
class LegalWebViewPage extends StatefulWidget {
  const LegalWebViewPage({super.key, required this.path, required this.title});

  /// Path relativo al backend, es. `/legal/privacy`.
  final String path;
  final String title;

  @override
  State<LegalWebViewPage> createState() => _LegalWebViewPageState();
}

class _LegalWebViewPageState extends State<LegalWebViewPage> {
  late final WebViewController _controller;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    final uri = Uri.parse('${Env.apiBaseUrl}${widget.path}');
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Theme.of(context).colorScheme.surface)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() => _loading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (err) {
            // Ignora errori di sotto-risorsa (asset interni), mostra solo errori
            // del documento principale.
            if (!err.isForMainFrame!) return;
            if (mounted) {
              setState(() {
                _loading = false;
                _error = err.description;
              });
            }
          },
          // Blocca navigazione fuori dal dominio dell'API (es. link esterni
          // nel contenuto delle pagine legali).
          onNavigationRequest: (req) {
            final reqUri = Uri.tryParse(req.url);
            final base = Uri.tryParse(Env.apiBaseUrl);
            if (reqUri != null &&
                base != null &&
                reqUri.host == base.host &&
                reqUri.path.startsWith('/legal')) {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(uri);
  }

  Future<void> _retry() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    final uri = Uri.parse('${Env.apiBaseUrl}${widget.path}');
    await _controller.loadRequest(uri);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Indietro',
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: Stack(
        children: [
          if (_error == null) WebViewWidget(controller: _controller),
          if (_loading && _error == null)
            const Center(child: CircularProgressIndicator()),
          if (_error != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.cloud_off_rounded,
                        size: 48, color: theme.disabledColor),
                    const SizedBox(height: 12),
                    Text(
                      'Impossibile caricare la pagina',
                      style: theme.textTheme.titleMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _error!,
                      style: theme.textTheme.bodySmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: _retry,
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Riprova'),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
