import 'package:flutter/animation.dart';

/// Animation curves dan durations untuk micro-interactions.
abstract final class AppAnimations {
  // Durations
  static const fast = Duration(milliseconds: 150);
  static const medium = Duration(milliseconds: 250);
  static const slow = Duration(milliseconds: 350);

  // Curves
  static const easeOut = Curves.easeOutCubic;
  static const bounce = Curves.easeOutBack;
  static const snap = Curves.easeInOutCubic;

  // Scale values
  static const scaleDown = 0.96;
  static const scaleNormal = 1.0;
}
