import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/announcements/presentation/announcements_page.dart';
import '../features/auth/presentation/auth_controller.dart';
import '../features/auth/presentation/login_page.dart';
import '../features/auth/presentation/splash_page.dart';
import '../features/documents/presentation/documents_page.dart';
import '../features/home/presentation/home_page.dart';
import '../features/home/presentation/main_shell.dart';
import '../features/onboarding/presentation/onboarding_page.dart';
import '../features/profile/presentation/profile_page.dart';
import '../features/progress/presentation/progress_page.dart';
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
      final loc = state.matchedLocation;

      // Stato non ancora risolto → mostra splash
      if (auth.isInitial) {
        return loc == '/splash' ? null : '/splash';
      }
      // Stato risolto, non autenticato → login
      if (!auth.isAuthenticated) {
        return loc == '/login' ? null : '/login';
      }
      // Autenticato → home (se ancora su splash/login)
      if (loc == '/splash' || loc == '/login') {
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
            path: '/progress',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: ProgressPage()),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: ProfilePage()),
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
    ],
  );
});

class _AuthRefreshNotifier extends ChangeNotifier {
  _AuthRefreshNotifier(this._ref) {
    _sub = _ref.listen(authControllerProvider, (_, _) {
      notifyListeners();
    });
  }

  final Ref _ref;
  late final ProviderSubscription _sub;

  @override
  void dispose() {
    _sub.close();
    super.dispose();
  }
}
