import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/altro/presentation/altro_page.dart';
import '../features/announcements/presentation/announcements_page.dart';
import '../features/bookings/presentation/bookings_list_page.dart';
import '../features/bookings/presentation/new_booking_page.dart';
import '../core/biometric/biometric_service.dart';
import '../features/auth/presentation/auth_controller.dart';
import '../features/auth/presentation/biometric_unlock_page.dart';
import '../features/auth/presentation/login_page.dart';
import '../features/auth/presentation/splash_page.dart';
import '../features/chat/presentation/chat_page.dart';
import '../features/documents/presentation/documents_page.dart';
import '../features/home/presentation/home_page.dart';
import '../features/home/presentation/main_shell.dart';
import '../features/nutrition/presentation/nutrition_page.dart';
import '../features/onboarding/presentation/onboarding_page.dart';
import '../features/packages/presentation/packages_page.dart';
import '../features/privacy/presentation/privacy_data_page.dart';
import '../features/settings/presentation/biometric_settings_page.dart';
import '../features/questionnaires/presentation/questionnaire_form_page.dart';
import '../features/questionnaires/presentation/questionnaires_list_page.dart';
import '../features/profile/presentation/profile_page.dart';
import '../features/progress/presentation/progress_page.dart';
import '../features/subscriptions/presentation/subscriptions_page.dart';
import '../features/workouts/presentation/assignment_detail_page.dart';
import '../features/workouts/presentation/assignments_list_page.dart';
import '../features/workouts/presentation/session_player_page.dart';
import '../features/workouts/presentation/workout_history_page.dart';

final routerProvider = Provider<GoRouter>((ref) {
  // Non `watch` di authControllerProvider qui per evitare ricreazione del router:
  // usiamo refreshListenable + read.
  final notifier = _AuthRefreshNotifier(ref);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: notifier,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final bio = ref.read(biometricGateControllerProvider);
      final loc = state.matchedLocation;

      // Stato auth non ancora risolto → mostra splash
      if (auth.isInitial) {
        return loc == '/splash' ? null : '/splash';
      }
      // Stato risolto, non autenticato → login
      if (!auth.isAuthenticated) {
        return loc == '/login' ? null : '/login';
      }
      // Autenticato — controllo biometric gate (H7)
      if (bio == BiometricGateState.initial) {
        return loc == '/splash' ? null : '/splash';
      }
      if (bio == BiometricGateState.locked) {
        return loc == '/biometric-unlock' ? null : '/biometric-unlock';
      }
      // bio: disabled o unlocked → libero
      if (loc == '/splash' || loc == '/login' || loc == '/biometric-unlock') {
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/biometric-unlock',
        builder: (context, state) => const BiometricUnlockPage(),
      ),
      GoRoute(
        path: '/onboarding-tour',
        builder: (context, state) => OnboardingPage(
          onDone: () => context.go('/home'),
        ),
      ),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: HomePage()),
          ),
          GoRoute(
            path: '/workouts',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: AssignmentsListPage()),
          ),
          GoRoute(
            path: '/nutrition',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: NutritionPage()),
          ),
          GoRoute(
            path: '/progress',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: ProgressPage()),
          ),
          GoRoute(
            path: '/altro',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: AltroPage()),
          ),
        ],
      ),
      // Rotte fullscreen (fuori dalla shell, no bottom nav)
      GoRoute(
        path: '/workouts/:id',
        builder: (context, state) {
          final id = int.parse(state.pathParameters['id']!);
          return AssignmentDetailPage(assignmentId: id);
        },
        routes: [
          GoRoute(
            path: 'history',
            builder: (context, state) {
              final id = int.parse(state.pathParameters['id']!);
              return WorkoutHistoryPage(assignmentId: id);
            },
          ),
          GoRoute(
            path: 'sessions/:logId',
            builder: (context, state) {
              final id = int.parse(state.pathParameters['id']!);
              final logId = int.parse(state.pathParameters['logId']!);
              return SessionPlayerPage(assignmentId: id, logId: logId);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/documents',
        builder: (context, state) => const DocumentsPage(),
      ),
      GoRoute(
        path: '/announcements',
        builder: (context, state) => const AnnouncementsPage(),
      ),
      GoRoute(
        path: '/packages',
        builder: (context, state) => const PackagesPage(),
      ),
      GoRoute(
        path: '/subscriptions',
        builder: (context, state) => const SubscriptionsPage(),
      ),
      GoRoute(
        path: '/bookings',
        builder: (context, state) => const BookingsListPage(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const NewBookingPage(),
          ),
        ],
      ),
      GoRoute(
        path: '/questionnaires',
        builder: (context, state) => const QuestionnairesListPage(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = int.parse(state.pathParameters['id']!);
              return QuestionnaireFormPage(assignmentId: id);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfilePage(),
      ),
      GoRoute(
        path: '/privacy',
        builder: (context, state) => const PrivacyDataPage(),
      ),
      GoRoute(
        path: '/settings/biometric',
        builder: (context, state) => const BiometricSettingsPage(),
      ),
      GoRoute(
        path: '/chat',
        builder: (context, state) => const ChatPage(),
      ),
    ],
  );
});

class _AuthRefreshNotifier extends ChangeNotifier {
  _AuthRefreshNotifier(this._ref) {
    _authSub = _ref.listen(authControllerProvider, (_, _) {
      notifyListeners();
    });
    _bioSub = _ref.listen(biometricGateControllerProvider, (_, _) {
      notifyListeners();
    });
  }

  final Ref _ref;
  late final ProviderSubscription _authSub;
  late final ProviderSubscription _bioSub;

  @override
  void dispose() {
    _authSub.close();
    _bioSub.close();
    super.dispose();
  }
}
