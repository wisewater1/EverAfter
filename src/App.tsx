import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/create-user" element={<AdminUserCreation />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/marketplace" element={
            <ProtectedRoute>
              <Marketplace />
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
      </Router>
    </AuthProvider>
  );
}

export default App;
