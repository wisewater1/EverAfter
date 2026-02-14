import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConnectionsProvider } from './contexts/ConnectionsContext';
import ProtectedRoute from './components/ProtectedRoute';
import ConnectionsPanel from './components/ConnectionsPanel';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationToast from './components/NotificationToast';
import HealthAlertListener from './components/HealthAlertListener';
import { attachEdgeReactive } from './lib/edge-reactive';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import HealthDashboard from './pages/HealthDashboard';
import OAuthCallback from './pages/OAuthCallback';
import Pricing from './pages/Pricing';
import AdminUserCreation from './pages/AdminUserCreation';
import Marketplace from './pages/Marketplace';
import CreatorDashboard from './pages/CreatorDashboard';
import MyAIs from './pages/MyAIs';
import UserPortal from './pages/UserPortal';
import UserProfileSetup from './pages/UserProfileSetup';
import AdminPortal from './pages/AdminPortal';
import DigitalLegacy from './pages/DigitalLegacy';
import LegacyVault from './pages/LegacyVault';
import InsuranceConnection from './pages/InsuranceConnection';
import EternalCareInsurance from './pages/EternalCareInsurance';
import MemorialServices from './pages/MemorialServices';
import RaphaelPrototype from './pages/RaphaelPrototype';
import RaphaelProductionDashboard from './pages/RaphaelProductionDashboard';
import BeyondModules from './pages/BeyondModules';
import DevicesDashboard from './components/DevicesDashboard';
import TerraSetupWizard from './components/TerraSetupWizard';
import TerraCallback from './pages/TerraCallback';
import DarkGlassCarouselShowcase from './pages/DarkGlassCarouselShowcase';
import DeviceCheck from './pages/DeviceCheck';

function ErrorNotifierConnector() {
  const { showNotification } = useNotification();
  const { setErrorNotifier } = useAuth();

  useEffect(() => {
    // Adapter for legacy auth error handling
    setErrorNotifier({
      showError: (msg, severity = 'critical') => {
        const typeMap: Record<string, 'error' | 'warning' | 'info'> = {
          'critical': 'error',
          'warning': 'warning',
          'info': 'info'
        };
        showNotification(msg, typeMap[severity] || 'error');
      }
    });
  }, [showNotification, setErrorNotifier]);

  return null;
}

function App() {
  useEffect(() => {
    const cleanup = attachEdgeReactive('.ea-panel');
    return cleanup;
  }, []);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <ConnectionsProvider>
            <ErrorNotifierConnector />
            <Router>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/admin/create-user" element={<AdminUserCreation />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/creator" element={
                  <ProtectedRoute>
                    <CreatorDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/my-ais" element={
                  <ProtectedRoute>
                    <MyAIs />
                  </ProtectedRoute>
                } />
                <Route path="/portal" element={
                  <ProtectedRoute>
                    <UserPortal />
                  </ProtectedRoute>
                } />
                <Route path="/portal/profile" element={
                  <ProtectedRoute>
                    <UserProfileSetup />
                  </ProtectedRoute>
                } />
                <Route path="/admin/portal" element={
                  <ProtectedRoute>
                    <AdminPortal />
                  </ProtectedRoute>
                } />
                <Route path="/beyond-modules" element={<BeyondModules />} />
                <Route path="/dark-glass-carousel" element={<DarkGlassCarouselShowcase />} />
                <Route path="/dev/device-check" element={<DeviceCheck />} />
                <Route path="/raphael-prototype" element={<RaphaelPrototype />} />
                <Route path="/raphael" element={
                  <ProtectedRoute>
                    <RaphaelProductionDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/digital-legacy" element={
                  <ProtectedRoute>
                    <DigitalLegacy />
                  </ProtectedRoute>
                } />
                <Route path="/legacy-vault" element={
                  <ProtectedRoute>
                    <LegacyVault />
                  </ProtectedRoute>
                } />
                <Route path="/insurance/connect" element={
                  <ProtectedRoute>
                    <InsuranceConnection />
                  </ProtectedRoute>
                } />
                <Route path="/insurance" element={
                  <ProtectedRoute>
                    <EternalCareInsurance />
                  </ProtectedRoute>
                } />
                <Route path="/memorial-services" element={
                  <ProtectedRoute>
                    <MemorialServices />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/health-dashboard" element={
                  <ProtectedRoute>
                    <HealthDashboard />
                  </ProtectedRoute>
                } />
                {/* LEGACY ROUTE REDIRECTS - PRESERVES OLD DEEP LINKS (NON-DESTRUCTIVE) */}
                <Route path="/emergency" element={
                  <Navigate to="/health-dashboard#emergency" replace />
                } />
                <Route path="/files" element={
                  <Navigate to="/health-dashboard#documents" replace />
                } />
                <Route path="/my-files" element={
                  <Navigate to="/health-dashboard#documents" replace />
                } />
                <Route path="/devices" element={
                  <ProtectedRoute>
                    <DevicesDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/oauth/callback" element={
                  <ProtectedRoute>
                    <OAuthCallback />
                  </ProtectedRoute>
                } />
                <Route path="/setup/terra" element={
                  <ProtectedRoute>
                    <TerraSetupWizard />
                  </ProtectedRoute>
                } />
                <Route path="/terra/return" element={
                  <ProtectedRoute>
                    <TerraCallback />
                  </ProtectedRoute>
                } />
              </Routes>
              <ConnectionsPanel />
            </Router>
            <HealthAlertListener />
            <NotificationToast />
          </ConnectionsProvider>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
