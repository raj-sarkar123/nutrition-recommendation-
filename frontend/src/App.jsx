import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ScanProvider } from './context/ScanContext';
import AppLayout from './components/layout/AppLayout';
import { NutritionProvider } from './context/NutritionContext';

/*
  FIX: Context ordering.

  BEFORE (broken):
    <ScanProvider>          ← outer
      <AuthProvider>        ← inner, calls useScan() internally
        ...
      </AuthProvider>
    </ScanProvider>

  Any scan state change re-renders AuthProvider → re-renders ALL routes.
  This was the main cause of sluggish tab switching.

  AFTER (fixed):
    <BrowserRouter>
      <AuthProvider>        ← auth stands alone, no scan dependency at provider level
        <ScanProvider>      ← scan is scoped inside authenticated tree only
          ...
        </ScanProvider>
      </AuthProvider>
    </BrowserRouter>

  AuthContext still calls useScan() in login/signup/logout — that's fine because
  those are event handlers, not render-time calls. The key is that ScanProvider
  no longer wraps AuthProvider, so scan state changes don't bubble up to auth.
*/

const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const TrackerPage = lazy(() => import('./pages/TrackerPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SmartInsightsPage = lazy(() => import('./pages/SmartInsightsPage'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface mesh-bg">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-4">
          {/*
            FIX: Don't use a material icon inside PageLoader.
            If the font hasn't loaded yet this is exactly the screen that shows —
            rendering an icon here causes the broken-text flash inside the loader itself.
            Use a pure CSS spinner instead.
          */}
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-on-surface-variant font-medium text-sm">Loading…</p>
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
    /*
      FIX: BrowserRouter is now the outermost wrapper so both AuthProvider
      and ScanProvider can use navigation hooks if needed in the future.
    */
    <BrowserRouter>
      <AuthProvider>
        <NutritionProvider>  {/* ← Here */}
          <ScanProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

                {/* Onboarding */}
                <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

                {/* Protected + Layout */}
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/scan" element={<ScanPage />} />
                  <Route path="/analysis" element={<AnalysisPage />} />
                  <Route path="/tracker" element={<TrackerPage />} />
                  <Route path="/progress" element={<ProgressPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/insights" element={<SmartInsightsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </ScanProvider>
        </NutritionProvider>  {/* ← Here */}
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;