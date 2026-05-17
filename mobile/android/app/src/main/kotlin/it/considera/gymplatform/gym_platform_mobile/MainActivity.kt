package it.considera.gymplatform.gym_platform_mobile

// `local_auth` (H7 biometric) richiede FlutterFragmentActivity invece di
// FlutterActivity per poter mostrare il BiometricPrompt (Android 9+).
import io.flutter.embedding.android.FlutterFragmentActivity

class MainActivity : FlutterFragmentActivity()
