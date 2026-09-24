import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Colored shadow tokens untuk depth dengan personality.
abstract final class AppShadows {
  static List<BoxShadow> card({Color? color}) => [
        BoxShadow(
          color: (color ?? AppColors.primary).withValues(alpha: 0.08),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> cardElevated({Color? color}) => [
        BoxShadow(
          color: (color ?? AppColors.primary).withValues(alpha: 0.12),
          blurRadius: 16,
          offset: const Offset(0, 6),
        ),
      ];

  static List<BoxShadow> attention(Color statusColor) => [
        BoxShadow(
          color: statusColor.withValues(alpha: 0.18),
          blurRadius: 14,
          offset: const Offset(0, 4),
          spreadRadius: 1,
        ),
      ];

  static List<BoxShadow> pressed({Color? color}) => [
        BoxShadow(
          color: (color ?? AppColors.primary).withValues(alpha: 0.15),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];
}
