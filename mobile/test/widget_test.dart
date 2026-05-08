import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:gym_platform_mobile/core/theme/app_theme.dart';
import 'package:gym_platform_mobile/core/widgets/primary_button.dart';

void main() {
  testWidgets('PrimaryButton renders label', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: PrimaryButton(
            label: 'Accedi',
            onPressed: () => tapped = true,
          ),
        ),
      ),
    );
    expect(find.text('Accedi'), findsOneWidget);
    await tester.tap(find.text('Accedi'));
    expect(tapped, isTrue);
  });
}
