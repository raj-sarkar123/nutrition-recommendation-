import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ScanProvider } from './context/ScanContext';
import AppLayout from './components/layout/AppLayout';

// Lazy load all pages — each becomes a separate chunk
const LoginPage        = lazy(() => import('./pages/LoginPage'));
const SignupPage       = lazy(() => import('./pages/SignupPage'));
const OnboardingPage   = lazy(() => import('./pages/OnboardingPage'));
const DashboardPage    = lazy(() => import('./pages/DashboardPage'));
const ScanPage         = lazy(() => import('./pages/ScanPage'));
const AnalysisPage     = lazy(() => import('./pages/AnalysisPage'));
const TrackerPage      = lazy(() => import('./pages/TrackerPage'));
const ProgressPage     = lazy(() => import('./pages/ProgressPage'));
const ProfilePage      = lazy(() => import('./pages/ProfilePage'));
const SmartInsightsPage = lazy(() => import('./pages/SmartInsightsPage'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface mesh-bg">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">
            progress_activity
          </span>
        </div>
        <p className="text-on-surface-variant font-medium">Loading…</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return user.isNewUser
      ? <Navigate to="/onboarding" replace />
      : <Navigate to="/dashboard" replace />;
  }
  return children;
}

function App() {
  return (
    <ScanProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Single Suspense wraps all routes — no per-route flicker */}
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

              {/* Onboarding */}
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

              {/* Protected + Layout */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/scan"      element={<ScanPage />} />
                <Route path="/analysis"  element={<AnalysisPage />} />
                <Route path="/tracker"   element={<TrackerPage />} />
                <Route path="/progress"  element={<ProgressPage />} />
                <Route path="/profile"   element={<ProfilePage />} />
                <Route path="/insights"  element={<SmartInsightsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ScanProvider>
  );
}

export default App;