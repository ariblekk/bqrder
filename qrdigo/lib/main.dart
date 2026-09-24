import 'package:flutter/material.dart';

import 'api.dart';
import 'login_page.dart';
import 'notifications.dart';
import 'pos_page.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.load();
  await Notif.init();
  if (Api.loggedIn) await Notif.registerToken();
  runApp(const QrdigoApp());
}

class QrdigoApp extends StatelessWidget {
  const QrdigoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QRDigo POS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: Api.loggedIn ? const PosPage() : const LoginPage(baseUrl: ''),
    );
  }
}
