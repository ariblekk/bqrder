import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Desain token untuk tipografi.
///
/// Nama mengikuti ukuran & konteks pemakaian, bukan ukuran piksel
/// agar perubahan skala cukup di satu tempat.
abstract final class AppText {
  static const double _tight = 1.25;

  // Header
  static const display = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w800,
    height: 1.1,
    letterSpacing: -0.5,
  );
  static const appTitle = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w800,
    height: _tight,
    letterSpacing: -0.2,
  );
  static const title = TextStyle(
    fontSize: 15.5,
    fontWeight: FontWeight.w700,
    height: _tight,
  );
  static const label = TextStyle(
    fontSize: 12.5,
    fontWeight: FontWeight.w600,
    height: _tight,
  );

  // Body
  static const body = TextStyle(
    fontSize: 13.5,
    fontWeight: FontWeight.w500,
    height: 1.35,
    color: AppColors.bodyText,
  );
  static const bodyStrong = TextStyle(
    fontSize: 13.5,
    fontWeight: FontWeight.w700,
    height: 1.35,
    color: AppColors.ink,
  );
  static const caption = TextStyle(
    fontSize: 11.5,
    fontWeight: FontWeight.w500,
    height: 1.3,
    color: AppColors.muted,
  );

  // Numbers
  static const price = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w800,
    height: 1.2,
    color: AppColors.ink,
  );
  static const priceLg = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w800,
    height: 1.2,
    color: AppColors.ink,
  );
  static const amount = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w800,
    height: 1.1,
    color: AppColors.ink,
  );

  // Interactive
  static const button = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w700,
  );
  static const chip = TextStyle(
    fontSize: 12.5,
    fontWeight: FontWeight.w600,
    color: AppColors.ink,
  );
  static const controlLabel = TextStyle(
    fontSize: 10.5,
    fontWeight: FontWeight.w700,
  );
  static const smallTag = TextStyle(
    fontSize: 10,
    fontWeight: FontWeight.w800,
    color: AppColors.onPrimary,
  );
}