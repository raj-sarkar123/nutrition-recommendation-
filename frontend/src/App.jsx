import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ScanProvider } from './context/ScanContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import ScanPage from './pages/ScanPage';
import AnalysisPage from './pages/AnalysisPage';
import TrackerPage from './pages/TrackerPage';
import ProgressPage from './pages/ProgressPage';
import ProfilePage from './pages/ProfilePage';
import SmartInsightsPage from './pages/SmartInsightsPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // ── KEY FIX: only show the spinner on the very first load (no flicker
  //   when switching tabs because subsequent navigations don't re-trigger
  //   the auth loading state).
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface mesh-bg">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary text-3xl animate-spin">
              progress_activity
            </span>
          </div>
          <p className="text-on-surface-variant font-medium">Loading NutriScan AI…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/signup"   element={<PublicRoute><SignupPage /></PublicRoute>} />

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
              <Route path="/insights" element={<SmartInsightsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ScanProvider>
  );
}

export default App;