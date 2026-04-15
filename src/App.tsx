import { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConnectionsProvider } from './contexts/ConnectionsContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { attachEdgeReactive } from './lib/edge-reactive';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { startSaintHeartbeat, stopSaintHeartbeat } from './lib/saintBridge';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';

const Landing = lazyWithRetry(() => import('./pages/Landing'), 'pages/Landing');
const StRaphaelHealthHub = lazyWithRetry(() => import('./pages/StRaphaelHealthHub'), 'pages/StRaphaelHealthHub');
const OAuthCallback = lazyWithRetry(() => import('./pages/OAuthCallback'), 'pages/OAuthCallback');
const Pricing = lazyWithRetry(() => import('./pages/Pricing'), 'pages/Pricing');
const AdminUserCreation = lazyWithRetry(() => import('./pages/AdminUserCreation'), 'pages/AdminUserCreation');
const Marketplace = lazyWithRetry(() => import('./pages/Marketplace'), 'pages/Marketplace');
const CreatorDashboard = lazyWithRetry(() => import('./pages/CreatorDashboard'), 'pages/CreatorDashboard');
const MyAIs = lazyWithRetry(() => import('./pages/MyAIs'), 'pages/MyAIs');
const UserPortal = lazyWithRetry(() => import('./pages/UserPortal'), 'pages/UserPortal');
const UserProfileSetup = lazyWithRetry(() => import('./pages/UserProfileSetup'), 'pages/UserProfileSetup');
const AdminPortal = lazyWithRetry(() => import('./pages/AdminPortal'), 'pages/AdminPortal');
const DigitalLegacy = lazyWithRetry(() => import('./pages/DigitalLegacy'), 'pages/DigitalLegacy');
const LegacyVault = lazyWithRetry(() => import('./pages/LegacyVault'), 'pages/LegacyVault');
const InsuranceConnection = lazyWithRetry(() => import('./pages/InsuranceConnection'), 'pages/InsuranceConnection');
const EternalCareInsurance = lazyWithRetry(() => import('./pages/EternalCareInsurance'), 'pages/EternalCareInsurance');
const MemorialServices = lazyWithRetry(() => import('./pages/MemorialServices'), 'pages/MemorialServices');
const BeyondModules = lazyWithRetry(() => import('./pages/BeyondModules'), 'pages/BeyondModules');
const DevicesDashboard = lazyWithRetry(() => import('./components/DevicesDashboard'), 'components/DevicesDashboard');
const TerraSetupWizard = lazyWithRetry(() => import('./components/TerraSetupWizard'), 'components/TerraSetupWizard');
const TerraCallback = lazyWithRetry(() => import('./pages/TerraCallback'), 'pages/TerraCallback');
const DarkGlassCarouselShowcase = lazyWithRetry(() => import('./pages/DarkGlassCarouselShowcase'), 'pages/DarkGlassCarouselShowcase');
const DeviceCheck = lazyWithRetry(() => import('./pages/DeviceCheck'), 'pages/DeviceCheck');
const Career = lazyWithRetry(() => import('./pages/Career'), 'pages/Career');
const PublicCareerChat = lazyWithRetry(() => import('./pages/PublicCareerChat'), 'pages/PublicCareerChat');
const StMichaelSecurityDashboard = lazyWithRetry(() => import('./components/StMichaelSecurityDashboard'), 'components/StMichaelSecurityDashboard');
const StJosephFamilyDashboard = lazyWithRetry(() => import('./components/StJosephFamilyDashboard'), 'components/StJosephFamilyDashboard');
const CouncilOracle = lazyWithRetry(() => import('./components/council/CouncilOracle'), 'components/council/CouncilOracle');
const TimeCapsuleVault = lazyWithRetry(() => import('./components/capsules/TimeCapsuleVault'), 'components/capsules/TimeCapsuleVault');
const RitualAltar = lazyWithRetry(() => import('./components/rituals/RitualAltar'), 'components/rituals/RitualAltar');
const SacredOverlay = lazyWithRetry(() => import('./components/rituals/SacredOverlay'), 'components/rituals/SacredOverlay');
const PersonalityTrainingCenter = lazyWithRetry(() => import('./components/personality/PersonalityTrainingCenter'), 'components/personality/PersonalityTrainingCenter');
const StAnthonyAuditDashboard = lazyWithRetry(() => import('./components/anthony/StAnthonyAuditDashboard'), 'components/anthony/StAnthonyAuditDashboard');
const StGabrielFinanceDashboard = lazyWithRetry(() => import('./components/gabriel/StGabrielFinanceDashboard'), 'components/gabriel/StGabrielFinanceDashboard');
const SystemMonitorDashboard = lazyWithRetry(() => import('./components/saints/SystemMonitorDashboard'), 'components/saints/SystemMonitorDashboard');
const TrinityDashboard = lazyWithRetry(() => import('./pages/TrinityDashboard'), 'pages/TrinityDashboard');
const ConnectionsPanel = lazyWithRetry(() => import('./components/ConnectionsPanel'), 'components/ConnectionsPanel');
const NotificationToast = lazyWithRetry(() => import('./components/NotificationToast'), 'components/NotificationToast');
const HealthAlertListener = lazyWithRetry(() => import('./components/HealthAlertListener'), 'components/HealthAlertListener');

const nonCoreRoutesEnabled = import.meta.env.VITE_ENABLE_NON_CORE_ROUTES === 'true';
const publicReleaseRedirect = <Navigate to="/" replace />;
const protectedReleaseRedirect = (
  <ProtectedRoute>
    <Navigate to="/dashboard" replace />
  </ProtectedRoute>
);

function RouteFallback() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4">
      <div className="text-center animate-fadeIn">
        <div className="relative mx-auto mb-6 w-14 h-14">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-sky-500/20 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-700 border-t-emerald-400" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-400 tracking-wide">Loading</p>
        <div className="mt-3 flex justify-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

/** Scrolls to top on route change */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
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
              <ScrollToTop />
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
