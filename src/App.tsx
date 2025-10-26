import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorNotificationProvider, useErrorNotification } from './contexts/ErrorNotificationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConnectionsProvider } from './contexts/ConnectionsContext';
import ProtectedRoute from './components/ProtectedRoute';
import ConnectionsPanel from './components/ConnectionsPanel';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorNotificationToast from './components/ErrorNotificationToast';
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
import DigitalLegacy from './pages/DigitalLegacy';
import LegacyVault from './pages/LegacyVault';

function ErrorNotifierConnector() {
  const { showError } = useErrorNotification();
  const { setErrorNotifier } = useAuth();

  useEffect(() => {
    setErrorNotifier({ showError });
  }, [showError, setErrorNotifier]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ErrorNotificationProvider>
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
                <Route path="/oauth/callback" element={
                  <ProtectedRoute>
                    <OAuthCallback />
                  </ProtectedRoute>
                } />
              </Routes>
              <ConnectionsPanel />
            </Router>
            <ErrorNotificationToast />
          </ConnectionsProvider>
        </AuthProvider>
      </ErrorNotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
