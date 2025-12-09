import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null); // для повідомлень про активацію / інфо

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const data = await login({ email, password });

      // Якщо увімкнена 2FA — йдемо по 2FA-флоу
      if (data.twoFactorRequired) {
        // збережемо email, щоб не просити ще раз
        localStorage.setItem('twoFactorEmail', email);

        // (опційно) покажемо код в dev середовищі, якщо бек повертає twoFactorCode
        if (data.twoFactorCode) {
          console.log('2FA DEV CODE:', data.twoFactorCode);
        }

        navigate('/login/2fa');
        return;
      }

      // Звичайний успішний логін через accessToken
      if (data.accessToken) {
        authLogin(data.accessToken);
        navigate('/me');
        return;
      }

      setError('Unexpected login response');
    } catch (err: unknown) {
      console.error(err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data as
          | { message?: string; code?: string; activationToken?: string }
          | undefined;

        const code = data?.code;
        const message =
          data?.message || 'Login failed';

        // Нова логіка: акаунт не активований або деактивований
        if (code === 'ACCOUNT_NOT_ACTIVATED' || code === 'ACCOUNT_DEACTIVATED') {
          setError(message);
          setInfo(
            'We have sent a new activation link to your email. Please check your inbox (and spam folder).',
          );

          // У dev середовищі бек може повертати activationToken — зручно для Postman/консолі
          if (data?.activationToken) {
            console.log('Activation token (dev):', data.activationToken);
          }

          setLoading(false);
          return;
        }

        // Інші помилки (невірний пароль, заблокований акаунт тощо)
        setError(message);
      } else {
        setError('Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1>Login</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            Email
            <br />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Password
            <br />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </label>
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>
        )}

        {info && (
          <div style={{ color: 'green', marginBottom: 12 }}>{info}</div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        Don&apos;t have an account?{' '}
        <button type="button" onClick={() => navigate('/register')}>
          Go to register
        </button>
      </p>

      <p style={{ marginTop: 16 }}>
        Forgot your password?{' '}
        <button type="button" onClick={() => navigate('/forgot-password')}>
          Reset it
        </button>
      </p>
    </div>
  );
};

export default LoginPage;
