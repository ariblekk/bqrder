import 'package:flutter/material.dart';

/// Desain token untuk warna.
///
/// Semua warna dipakai lewat token ini agar konsisten dan mudah diubah.
abstract final class AppColors {
  // Surfaces (hangat)
  static const bg = Color(0xFFFFF8F1);
  static const surface = Color(0xFFFFFFFF);
  static const neutral = Color(0xFFFFF1E3);
  static const wipe = Color(0xFFFDF2E9);

  // Ink / Text
  static const ink = Color(0xFF2A211B);
  static const muted = Color(0xFF8A7F76);
  static const hairline = Color(0xFFD9CCC0);
  static const step = Color(0xFFB7A99C);

  // Brand / Action
  static const primary = Color(0xFFF97316);
  static const primaryDeep = Color(0xFFEA580C);
  static const primarySoft = Color(0xFFFFE4CC);
  static const onPrimary = Colors.white;

  // Accent (teal)
  static const accent = Color(0xFF0D9488);
  static const accentSoft = Color(0xFFCCFBF1);

  // Outline
  static const line = Color(0xFFF0E4D8);
  static const outline = Color(0xFFE4D6C7);

  // Status
  static const danger = Color(0xFFDC2626);
  static const dangerPressed = Color(0xFF991B1B);
  static const warning = Color(0xFFF59E0B);
  static const info = Color(0xFF0D9488);
  static const success = Color(0xFF10B981);
  static const dark = Color(0xFF1F2937);

  // Pseudo-elements
  static const bodyText = Color(0xFF57534E);
  static const controlPressed = Color(0xFFF3E7DA);
  static const inversePrimary = Color(0xFFFFE4CC);
}
