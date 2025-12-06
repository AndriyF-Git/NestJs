import React, { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../api/api';

interface MeResponse {
  id: string;
  email: string;
  isActive?: boolean;
  isTwoFactorEnabled?: boolean;
  // додай сюди ще поля, які реально повертає твій /auth/me
}

const MePage: React.FC = () => {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <p><strong>ID:</strong> {user.id}</p>
      <p><strong>Email:</strong> {user.email}</p>
      {user.isActive !== undefined && (
        <p><strong>Active:</strong> {user.isActive ? 'Yes' : 'No'}</p>
      )}
      {user.isTwoFactorEnabled !== undefined && (
        <p>
          <strong>2FA:</strong> {user.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
        </p>
      )}

      <button
        style={{ marginTop: 20 }}
        onClick={() => {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default MePage;
