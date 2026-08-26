import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import AuthGuard from './components/auth/AuthGuard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/common/ErrorBoundary';


function App() {
  return (
    <ErrorBoundary>
      <Router>
      <Toaster position="top-right" toastOptions={{ style: { zIndex: 99999 } }} />
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Routes */}
        <Route path="/" element={
          <AuthGuard>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </AuthGuard>
        } />

        <Route path="/logs" element={
          <AuthGuard>
            <DashboardLayout>
              <AuditLogs />
            </DashboardLayout>
          </AuthGuard>
        } />

        <Route path="/settings" element={
          <AuthGuard>
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </AuthGuard>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </ErrorBoundary>
  );
}

export default App;