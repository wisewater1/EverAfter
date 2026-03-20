import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConnectionsProvider } from './contexts/ConnectionsContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { attachEdgeReactive } from './lib/edge-reactive';
import { startSaintHeartbeat, stopSaintHeartbeat } from './lib/saintBridge';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';

const Landing = lazy(() => import('./pages/Landing'));
const StRaphaelHealthHub = lazy(() => import('./pages/StRaphaelHealthHub'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const Pricing = lazy(() => import('./pages/Pricing'));
const AdminUserCreation = lazy(() => import('./pages/AdminUserCreation'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const CreatorDashboard = lazy(() => import('./pages/CreatorDashboard'));
const MyAIs = lazy(() => import('./pages/MyAIs'));
const UserPortal = lazy(() => import('./pages/UserPortal'));
const UserProfileSetup = lazy(() => import('./pages/UserProfileSetup'));
const AdminPortal = lazy(() => import('./pages/AdminPortal'));
const DigitalLegacy = lazy(() => import('./pages/DigitalLegacy'));
const LegacyVault = lazy(() => import('./pages/LegacyVault'));
const InsuranceConnection = lazy(() => import('./pages/InsuranceConnection'));
const EternalCareInsurance = lazy(() => import('./pages/EternalCareInsurance'));
const MemorialServices = lazy(() => import('./pages/MemorialServices'));
const BeyondModules = lazy(() => import('./pages/BeyondModules'));
const DevicesDashboard = lazy(() => import('./components/DevicesDashboard'));
const TerraSetupWizard = lazy(() => import('./components/TerraSetupWizard'));
const TerraCallback = lazy(() => import('./pages/TerraCallback'));
const DarkGlassCarouselShowcase = lazy(() => import('./pages/DarkGlassCarouselShowcase'));
const DeviceCheck = lazy(() => import('./pages/DeviceCheck'));
const Career = lazy(() => import('./pages/Career'));
const PublicCareerChat = lazy(() => import('./pages/PublicCareerChat'));
const StMichaelSecurityDashboard = lazy(() => import('./components/StMichaelSecurityDashboard'));
const StJosephFamilyDashboard = lazy(() => import('./components/StJosephFamilyDashboard'));
const CouncilOracle = lazy(() => import('./components/council/CouncilOracle'));
const TimeCapsuleVault = lazy(() => import('./components/capsules/TimeCapsuleVault'));
const RitualAltar = lazy(() => import('./components/rituals/RitualAltar'));
const SacredOverlay = lazy(() => import('./components/rituals/SacredOverlay'));
const PersonalityTrainingCenter = lazy(() => import('./components/personality/PersonalityTrainingCenter'));
const StAnthonyAuditDashboard = lazy(() => import('./components/anthony/StAnthonyAuditDashboard'));
const StGabrielFinanceDashboard = lazy(() => import('./components/gabriel/StGabrielFinanceDashboard'));
const SystemMonitorDashboard = lazy(() => import('./components/saints/SystemMonitorDashboard'));
const TrinityDashboard = lazy(() => import('./pages/TrinityDashboard'));
const ConnectionsPanel = lazy(() => import('./components/ConnectionsPanel'));
const NotificationToast = lazy(() => import('./components/NotificationToast'));
const HealthAlertListener = lazy(() => import('./components/HealthAlertListener'));

const nonCoreRoutesEnabled = import.meta.env.VITE_ENABLE_NON_CORE_ROUTES === 'true';
const publicReleaseRedirect = <Navigate to="/" replace />;
const protectedReleaseRedirect = (
  <ProtectedRoute>
    <Navigate to="/dashboard" replace />
  </ProtectedRoute>
);

function RouteFallback() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-400" />
        <p className="text-sm tracking-wide text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

function ErrorNotifierConnector() {
  const { showNotification } = useNotification();
  const { setErrorNotifier } = useAuth();

  useEffect(() => {
    setErrorNotifier({
      showError: (msg, severity = 'critical') => {
        const typeMap: Record<string, 'error' | 'warning' | 'info'> = {
          critical: 'error',
          warning: 'warning',
          info: 'info',
        };
        showNotification(msg, typeMap[severity] || 'error');
      },
    });
  }, [showNotification, setErrorNotifier]);

  return null;
}

function App() {
  useEffect(() => {
    const cleanup = attachEdgeReactive('.ea-panel');
    startSaintHeartbeat();
    return () => {
      cleanup();
      stopSaintHeartbeat();
    };
  }, []);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <ConnectionsProvider>
            <ErrorNotifierConnector />
            <Router>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/admin/create-user" element={nonCoreRoutesEnabled ? <AdminUserCreation /> : publicReleaseRedirect} />
                  <Route path="/pricing" element={nonCoreRoutesEnabled ? <Pricing /> : publicReleaseRedirect} />
                  <Route path="/marketplace" element={nonCoreRoutesEnabled ? <Marketplace /> : publicReleaseRedirect} />
                  <Route
                    path="/creator"
                    element={
                      nonCoreRoutesEnabled ? (
                        <ProtectedRoute>
                          <CreatorDashboard />
                        </ProtectedRoute>
                      ) : protectedReleaseRedirect
                    }
                  />
                  <Route
                    path="/my-ais"
                    element={
                      nonCoreRoutesEnabled ? (
                        <ProtectedRoute>
                          <MyAIs />
                        </ProtectedRoute>
                      ) : protectedReleaseRedirect
                    }
                  />
                  <Route
                    path="/portal"
                    element={
                      <ProtectedRoute>
                        <UserPortal />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/portal/profile"
                    element={
                      <ProtectedRoute>
                        <UserProfileSetup />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/portal"
                    element={
                      nonCoreRoutesEnabled ? (
                        <ProtectedRoute>
                          <AdminPortal />
                        </ProtectedRoute>
                      ) : protectedReleaseRedirect
                    }
                  />
                  <Route path="/beyond-modules" element={nonCoreRoutesEnabled ? <BeyondModules /> : publicReleaseRedirect} />
                  <Route path="/dark-glass-carousel" element={nonCoreRoutesEnabled ? <DarkGlassCarouselShowcase /> : publicReleaseRedirect} />
                  <Route path="/dev/device-check" element={nonCoreRoutesEnabled ? <DeviceCheck /> : publicReleaseRedirect} />
                  <Route path="/raphael-prototype" element={<Navigate to="/health-dashboard" replace />} />
                  <Route path="/raphael" element={<Navigate to="/health-dashboard" replace />} />
                  <Route
                    path="/digital-legacy"
                    element={
                      <ProtectedRoute>
                        <DigitalLegacy />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/legacy-vault"
                    element={
                      <ProtectedRoute>
                        <LegacyVault />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/insurance/connect"
                    element={
                      nonCoreRoutesEnabled ? (
                        <ProtectedRoute>
                          <InsuranceConnection />
                        </ProtectedRoute>
                      ) : protectedReleaseRedirect
                    }
                  />
                  <Route
                    path="/insurance"
                    element={
                      nonCoreRoutesEnabled ? (
                        <ProtectedRoute>
                          <EternalCareInsurance />
                        </ProtectedRoute>
                      ) : protectedReleaseRedirect
                    }
                  />
                  <Route
                    path="/memorial-services"
                    element={
                      nonCoreRoutesEnabled ? (
                        <ProtectedRoute>
                          <MemorialServices />
                        </ProtectedRoute>
                      ) : protectedReleaseRedirect
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/health-dashboard"
                    element={
                      <ProtectedRoute>
                        <StRaphaelHealthHub />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/security-dashboard"
                    element={
                      <ProtectedRoute>
                        <StMichaelSecurityDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/michael-dashboard" element={<Navigate to="/security-dashboard" replace />} />
                  <Route
                    path="/family-dashboard"
                    element={
                      <ProtectedRoute>
                        <StJosephFamilyDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/saints" element={<Navigate to="/dashboard" replace />} />
                  <Route
                    path="/anthony-dashboard"
                    element={
                      <ProtectedRoute>
                        <StAnthonyAuditDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/finance-dashboard"
                    element={
                      <ProtectedRoute>
                        <StGabrielFinanceDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/monitor"
                    element={
                      <ProtectedRoute>
                        <SystemMonitorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/trinity"
                    element={
                      <ProtectedRoute>
                        <TrinityDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/emergency" element={<Navigate to="/health-dashboard#emergency" replace />} />
                  <Route path="/files" element={<Navigate to="/health-dashboard#documents" replace />} />
                  <Route path="/my-files" element={<Navigate to="/health-dashboard#documents" replace />} />
                  <Route
                    path="/devices"
                    element={
                      <ProtectedRoute>
                        <DevicesDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/oauth/callback"
                    element={
                      <ProtectedRoute>
                        <OAuthCallback />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/setup/terra"
                    element={
                      <ProtectedRoute>
                        <TerraSetupWizard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/terra/return"
                    element={
                      <ProtectedRoute>
                        <TerraCallback />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/career"
                    element={
                      <ProtectedRoute>
                        <Career />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/council"
                    element={
                      <ProtectedRoute>
                        <CouncilOracle />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/time-capsules"
                    element={
                      <ProtectedRoute>
                        <TimeCapsuleVault />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/rituals"
                    element={
                      <ProtectedRoute>
                        <RitualAltar />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/personality-training"
                    element={
                      <ProtectedRoute>
                        <PersonalityTrainingCenter />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/career/public/:token" element={nonCoreRoutesEnabled ? <PublicCareerChat /> : publicReleaseRedirect} />
                </Routes>
                <ConnectionsPanel />
                <SacredOverlay />
              </Suspense>
            </Router>
            <Suspense fallback={null}>
              <HealthAlertListener />
              <NotificationToast />
            </Suspense>
          </ConnectionsProvider>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
