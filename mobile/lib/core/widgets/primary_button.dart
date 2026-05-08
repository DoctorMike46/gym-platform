import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
    this.fullWidth = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final bool fullWidth;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final disabled = loading || onPressed == null;

    final child = Row(
      mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading)
          const SizedBox(
            height: 18,
            width: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.white,
            ),
          )
        else if (icon != null) ...[
          Icon(icon, size: 18, color: AppColors.white),
          const SizedBox(width: 8),
        ],
        if (!loading)
          Text(
            label,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.white,
              letterSpacing: 0.2,
            ),
          ),
      ],
    );

    return SizedBox(
      width: fullWidth ? double.infinity : null,
      child: Material(
        color: Colors.transparent,
        child: Ink(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                theme.colorScheme.primary,
                Color.lerp(theme.colorScheme.primary, AppColors.brandAccent, 0.35) ??
                    theme.colorScheme.primary,
              ],
            ),
            borderRadius: BorderRadius.circular(AppRadius.md),
            boxShadow: disabled
                ? null
                : [
                    BoxShadow(
                      color: theme.colorScheme.primary.withValues(alpha: 0.3),
                      blurRadius: 16,
                      offset: const Offset(0, 8),
                    ),
                  ],
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(AppRadius.md),
            onTap: disabled ? null : onPressed,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 16,
              ),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
