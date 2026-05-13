import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Icone Chat + Profilo in alto a destra, usate dalle pagine principali
/// della bottom nav. Da inserire come `AppBar(actions: [const TopBarActions()])`
/// oppure dentro un header custom (es. `HeroSection` di Home).
class TopBarActions extends StatelessWidget {
  const TopBarActions({super.key, this.color});

  /// Override del colore icone. Default: colore di default dell'icona dal tema.
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          tooltip: 'Chat',
          icon: Icon(Icons.chat_bubble_outline_rounded, color: color, size: 22),
          visualDensity: VisualDensity.compact,
          padding: const EdgeInsets.all(6),
          constraints: const BoxConstraints(),
          onPressed: () => context.push('/chat'),
        ),
        const SizedBox(width: 4),
        IconButton(
          tooltip: 'Profilo',
          icon: Icon(Icons.person_outline_rounded, color: color, size: 22),
          visualDensity: VisualDensity.compact,
          padding: const EdgeInsets.all(6),
          constraints: const BoxConstraints(),
          onPressed: () => context.push('/profile'),
        ),
      ],
    );
  }
}
