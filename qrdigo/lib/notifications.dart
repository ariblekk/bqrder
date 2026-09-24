import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'api.dart';

/// Runs in the OS background when the app is terminated. FCM delivers the
/// notification; Android shows it in the tray automatically, no app work needed.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (message.data['type'] == 'order.new') {
    Api.onOrderEvent?.call();
  }
}

/// Push notification wiring: Firebase init, FCM token registration, foreground
/// display. Every call is defensive — without a Firebase project
/// (google-services.json / GoogleService-Info.plist) the app just skips push
/// and keeps working.
class Notif {
  static bool ready = false;
  static String? _token;
  static final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _local =
      FlutterLocalNotificationsPlugin();
  static int _notifId = 0;

  static bool get _isMobile =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  static Future<void> init() async {
    if (!_isMobile) return;
    try {
      await Firebase.initializeApp();
    } catch (_) {
      return; // Firebase not configured on this device; push disabled.
    }
    ready = true;

    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    try {
      await _local.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(),
        ),
      );
      await _local
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
    } catch (_) {
      // Foreground tray display unavailable; FCM still delivers in background.
    }

    final initial = await _fcm.getInitialMessage();
    if (initial != null) _handle(initial);

    FirebaseMessaging.onMessage.listen(_handle);
    FirebaseMessaging.onMessageOpenedApp.listen(_handle);
    _fcm.onTokenRefresh.listen(registerToken);
  }

  static Future<void> registerToken([String? token]) async {
    if (!ready) return;
    try {
      final t = token ?? await _fcm.getToken();
      if (t == null || t == _token) return;
      _token = t;
      final platform =
          defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';
      await Api.registerDevice(t, platform);
    } catch (_) {
      // Token registration is best-effort; retried on next refresh/login.
    }
  }

  static Future<void> unregisterToken() async {
    final t = _token;
    _token = null;
    if (!ready || t == null) return;
    try {
      await Api.unregisterDevice(t);
    } catch (_) {
      // Backend may be unreachable during logout; token lingers harmlessly.
    }
  }

  static void _handle(RemoteMessage message) {
    if (message.data['type'] != 'order.new') return;
    final title = message.notification?.title ?? 'Order Baru';
    final body = message.notification?.body ?? '';
    _show(title, body);
    Api.onOrderEvent?.call();
  }

  static Future<void> _show(String title, String body) async {
    try {
      await _local.show(
        id: _notifId++,
        title: title,
        body: body,
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            'orders',
            'Order Baru',
            channelDescription: 'Notifikasi order masuk',
            importance: Importance.high,
            priority: Priority.high,
          ),
          iOS: DarwinNotificationDetails(),
        ),
      );
    } catch (_) {
      // Background tray covers this when the app is closed; fail quietly.
    }
  }
}