import 'dart:ui' show Color;

import '../../theme/app_colors.dart';

/// Warna untuk status pesanan / pembayaran.
Color statusColor(String status) {
  switch (status.toLowerCase()) {
    case 'pending':
      return AppColors.warning;
    case 'processing':
    case 'paying':
      return AppColors.info;
    case 'paid':
    case 'completed':
      return AppColors.success;
    case 'unpaid':
      return AppColors.danger;
    case 'cancelled':
    case 'refunded':
    default:
      return AppColors.muted;
  }
}