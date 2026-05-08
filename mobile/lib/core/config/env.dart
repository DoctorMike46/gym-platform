/// Environment configuration. Override at build time with --dart-define:
///
///   flutter run --dart-define=API_BASE_URL=https://api.example.com
///
/// Default points to localhost:3000 (Next.js dev server).
class Env {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const String flavor = String.fromEnvironment(
    'FLAVOR',
    defaultValue: 'dev',
  );

  static const String appScheme = String.fromEnvironment(
    'APP_SCHEME',
    defaultValue: 'gymplatform',
  );

  static bool get isProd => flavor == 'prod';
  static bool get isStaging => flavor == 'staging';
  static bool get isDev => flavor == 'dev';
}
