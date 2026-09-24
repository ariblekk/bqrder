import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:qrdigo/login_page.dart';

void main() {
  testWidgets('Login page renders fields', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: LoginPage(baseUrl: '')),
    );

    expect(find.text('qrdigo'), findsOneWidget);
    expect(find.text('URL Base'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Masuk'), findsOneWidget);
  });
}