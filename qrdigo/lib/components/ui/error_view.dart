import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// Error menyeluruh dengan tombol coba lagi.
class ErrorView extends StatelessWidget {
  const ErrorView({
    super.key,
    this.title = 'Gagal memuat data',
    required this.message,
    required this.onRetry,
  });

  final String title;
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_rounded, size: 56, color: AppColors.hairline),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center, style: AppText.title),
            const SizedBox(height: 4),
            Text(message, textAlign: TextAlign.center, style: AppText.body),
            const SizedBox(height: 16),
            FilledButton.tonal(onPressed: onRetry, child: const Text('Muat ulang')),
          ],
        ),
      ),
    );
  }
}