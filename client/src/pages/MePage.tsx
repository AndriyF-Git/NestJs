import React, { useEffect, useState } from 'react';
import { enableTwoFactor, disableTwoFactor } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

interface MeResponse {
  id: string;
  email: string;
  isActive?: boolean;
  twoFactorEnabled?: boolean;
}

const MePage: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();

  // стани для 2FA
  const [passwordFor2fa, setPasswordFor2fa] = useState('');
  const [loading2fa, setLoading2fa] = useState(false);
  const [message2fa, setMessage2fa] = useState<string | null>(null);
  const [error2fa, setError2fa] = useState<string | null>(null);

  // стани для зміни пароля
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loadingChangePassword, setLoadingChangePassword] = useState(false);
  const [errorChangePassword, setErrorChangePassword] = useState<string | null>(null);
  const [messageChangePassword, setMessageChangePassword] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get<MeResponse>('/auth/me');
        setUser(res.data);
      } catch (err: unknown) {
        console.error(err);
        if (axios.isAxiosError(err)) {
          const msg =
            (err.response?.data as { message?: string })?.message ||
            'Failed to load profile';
          setError(msg);
        } else {
          setError('Unexpected error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const handleToggle2fa = async () => {
    if (!user) return;

    setError2fa(null);
    setMessage2fa(null);
    setLoading2fa(true);

    try {
      const payload = {
        email: user.email,
        password: passwordFor2fa,
      };

      const data = user.twoFactorEnabled
        ? await disableTwoFactor(payload)
        : await enableTwoFactor(payload);

      setMessage2fa(
        (data && (data.message as string | undefined)) ||
          '2FA settings updated successfully',
      );

      // оновлюємо локальний стан, щоб відобразити новий статус
      setUser({
        ...user,
        twoFactorEnabled: !user.twoFactorEnabled,
      });

      setPasswordFor2fa('');
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ||
          'Failed to update 2FA settings';
        setError2fa(msg);
      } else {
        setError2fa('Unexpected error');
      }
    } finally {
      setLoading2fa(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorChangePassword(null);
    setMessageChangePassword(null);

    if (newPassword !== confirmNewPassword) {
      setErrorChangePassword('Новий пароль і підтвердження не збігаються');
      return;
    }

    try {
      setLoadingChangePassword(true);

      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setMessageChangePassword('Пароль успішно змінено');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const raw = (err.response?.data as { message?: string | string[] })?.message;
        let msg: string;

        if (Array.isArray(raw)) {
          msg = raw.join(', ');
        } else if (typeof raw === 'string') {
          msg = raw;
        } else {
          msg = 'Не вдалося змінити пароль';
        }

        setErrorChangePassword(msg);
      } else {
        setErrorChangePassword('Unexpected error');
      }
    } finally {
      setLoadingChangePassword(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
  }

  if (!user) {
    return <div style={{ padding: 20 }}>No user data</div>;
  }

  return (
    <div style={{ maxWidth: 500, margin: '40px auto' }}>
      <h1>My profile</h1>
      <p>
        <strong>ID:</strong> {user.id}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      {user.isActive !== undefined && (
        <p>
          <strong>Active:</strong> {user.isActive ? 'Yes' : 'No'}
        </p>
      )}
      {user.twoFactorEnabled !== undefined && (
        <p>
          <strong>2FA:</strong>{' '}
          {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
        </p>
      )}

      {/* Блок управління 2FA */}
      <div
        style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}
      >
        <h3>{user.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}</h3>
        <p>Enter your password to confirm this action:</p>
        <input
          type="password"
          value={passwordFor2fa}
          onChange={(e) => setPasswordFor2fa(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />

        {error2fa && (
          <div style={{ color: 'red', marginBottom: 8 }}>{error2fa}</div>
        )}
        {message2fa && (
          <div style={{ color: 'green', marginBottom: 8 }}>{message2fa}</div>
        )}

        <button
          onClick={handleToggle2fa}
          disabled={loading2fa || !passwordFor2fa}
        >
          {loading2fa
            ? 'Processing...'
            : user.twoFactorEnabled
              ? 'Disable 2FA'
              : 'Enable 2FA'}
        </button>
      </div>

      {/* Блок зміни пароля */}
      <div
        style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}
      >
        <h3>Change password</h3>
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: 8 }}>
            <label>
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
                required
              />
            </label>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
                required
              />
            </label>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>
              Confirm new password
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
                required
              />
            </label>
          </div>

          {errorChangePassword && (
            <div style={{ color: 'red', marginBottom: 8 }}>
              {errorChangePassword}
            </div>
          )}
          {messageChangePassword && (
            <div style={{ color: 'green', marginBottom: 8 }}>
              {messageChangePassword}
            </div>
          )}

          <button type="submit" disabled={loadingChangePassword}>
            {loadingChangePassword ? 'Changing...' : 'Change password'}
          </button>
        </form>
      </div>

      <button
        style={{ marginTop: 20 }}
        onClick={() => {
          logout();
          navigate('/login');
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default MePage;
