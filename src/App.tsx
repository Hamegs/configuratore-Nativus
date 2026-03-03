import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth-store';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { AdminPage } from './pages/AdminPage';
import { ProjectPage } from './pages/ProjectPage';
import { RoomWizardPage } from './pages/RoomWizardPage';
import { ProjectCartView } from './components/project/ProjectCartView';

export default function App() {
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Main landing → always Progetti */}
        <Route path="/" element={<Navigate to="/progetto" replace />} />

        {/* ── Core routes ─────────────────────────────────────────────────── */}
        <Route
          path="/progetto"
          element={
            <ProtectedRoute>
              <AppShell>
                <ProjectPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/progetto/stanza/:roomId"
          element={
            <ProtectedRoute>
              <AppShell>
                <RoomWizardPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/progetto/carrello"
          element={
            <ProtectedRoute>
              <AppShell>
                <ProjectCartView />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppShell>
                <AdminPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/progetto" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
