import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MePage from './pages/MePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TwoFactorPage from './pages/TwoFaPage';
import AdminPage from './pages/AdminPage';
import { useAuth } from './context/AuthContext';

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/2fa" element={<TwoFactorPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/me"
        element={
          isAuthenticated ? <MePage /> : <Navigate to="/login" replace />
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
      <Route
        path="/admin"
        element={
          isAuthenticated ? <AdminPage /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
};

export default App;
