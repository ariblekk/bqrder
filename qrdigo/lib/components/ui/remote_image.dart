import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

/// Gambar dari URL dengan placeholder ter-atur.
class RemoteImage extends StatelessWidget {
  const RemoteImage({super.key, required this.url, this.fit = BoxFit.cover});

  final String url;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    return Image.network(
      url,
      fit: fit,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return Container(
          color: AppColors.neutral,
          child: const Center(
            child: SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        );
      },
      errorBuilder: (_, _, _) => Container(
        color: AppColors.neutral,
        child: const Center(
          child: Icon(Icons.restaurant_rounded, color: AppColors.hairline),
        ),
      ),
    );
  }
}