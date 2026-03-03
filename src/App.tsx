import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth-store';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { DashboardPage } from './pages/DashboardPage';
import { ConfiguratorePage } from './pages/ConfiguratorePage';
import { AdminPage } from './pages/AdminPage';
import { ProjectPage } from './pages/ProjectPage';
import { RoomWizardPage } from './pages/RoomWizardPage';
import { ProjectCartView } from './components/project/ProjectCartView';
import { VistaApplicatoreProgetto } from './components/views/VistaApplicatoreProgetto';
import { ApplicatoreDashboard } from './pages/applicatore/ApplicatoreDashboard';
import { RivenditoresDashboard } from './pages/rivenditore/RivenditoresDashboard';
import { ProgettistaDashboard } from './pages/progettista/ProgettistaDashboard';

export default function App() {
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell>
                <DashboardPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ── Role-specific dashboards ─────────────────────────────────────── */}
        <Route
          path="/applicatore"
          element={
            <ProtectedRoute allowedRoles={['admin', 'applicatore']}>
              <AppShell>
                <ApplicatoreDashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rivenditore"
          element={
            <ProtectedRoute allowedRoles={['admin', 'rivenditore']}>
              <AppShell>
                <RivenditoresDashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/progettista"
          element={
            <ProtectedRoute allowedRoles={['admin', 'progettista']}>
              <AppShell>
                <ProgettistaDashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ── Existing routes ───────────────────────────────────────────────── */}
        <Route
          path="/configuratore"
          element={
            <ProtectedRoute allowedRoles={['admin', 'rivenditore', 'applicatore']}>
              <AppShell>
                <ConfiguratorePage />
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

        <Route
          path="/progetto"
          element={
            <ProtectedRoute allowedRoles={['admin', 'rivenditore']}>
              <AppShell>
                <ProjectPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/progetto/stanza/:roomId"
          element={
            <ProtectedRoute allowedRoles={['admin', 'rivenditore', 'applicatore', 'progettista']}>
              <AppShell>
                <RoomWizardPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/progetto/carrello"
          element={
            <ProtectedRoute allowedRoles={['admin', 'rivenditore']}>
              <AppShell>
                <ProjectCartView />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/progetto/applicatore"
          element={
            <ProtectedRoute allowedRoles={['admin', 'rivenditore', 'applicatore']}>
              <AppShell>
                <VistaApplicatoreProgetto />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
