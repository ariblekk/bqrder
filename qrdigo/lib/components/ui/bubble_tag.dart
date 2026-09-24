import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';

/// Label kecil dengan latar & warna teks tertentu.
class BubbleTag extends StatelessWidget {
  const BubbleTag(
    this.label, {
    super.key,
    this.background = AppColors.primary,
    this.foreground = AppColors.onPrimary,
  });

  final String label;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppRadii.pill),
      ),
      child: Text(label, style: AppText.smallTag.copyWith(color: foreground)),
    );
  }
}