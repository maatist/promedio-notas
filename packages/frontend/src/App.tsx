import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './i18n';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ImportSubjectPage from './pages/ImportSubjectPage';
import InstallPrompt from './components/InstallPrompt';
import OfflineIndicator from './components/OfflineIndicator';

function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/import/:token" element={<ImportSubjectPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <InstallPrompt />
          <OfflineIndicator />
          <Toaster
            position="bottom-center"
            toastOptions={{
              className: 'text-sm font-medium',
              style: {
                borderRadius: '12px',
                padding: '12px 16px',
              },
              success: {
                style: {
                  background: '#f3e8ff',
                  color: '#6b21a8',
                  border: '1px solid #e9d5ff',
                },
              },
              error: {
                style: {
                  background: '#ffe4e6',
                  color: '#9f1239',
                  border: '1px solid #fecdd3',
                },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
