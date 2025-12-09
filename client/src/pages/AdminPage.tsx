import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { fetchAdminUsers, toggleUserActive } from '../api/admin';
import type { AdminUser } from '../api/admin';
import { useNavigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setError(null);
    setActionMessage(null);
    setLoading(true);

    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 403) {
          setError('You do not have permission to access admin panel.');
        } else if (status === 401) {
          setError('Your session has expired. Please log in again.');
          navigate('/login');
        } else {
          const msg =
            (err.response?.data as { message?: string })?.message ||
            'Failed to load users.';
          setError(msg);
        }
      } else {
        setError('Unexpected error while loading users.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleToggleActive = async (id: number) => {
    try {
      const res = await toggleUserActive(id);
      setActionMessage(res.message);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, isActive: res.isActive } : u,
        ),
      );
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ||
          'Failed to update user status.';
        setError(msg);
      } else {
        setError('Unexpected error while updating user status.');
      }
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading admin panel...</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto' }}>
      <h1>Admin panel</h1>

      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      {actionMessage && (
        <div style={{ color: 'green', marginBottom: 12 }}>
          {actionMessage}
        </div>
      )}

      <button style={{ marginBottom: 16 }} onClick={() => navigate('/me')}>
        Back to profile
      </button>

      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: 8,
          }}
        >
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>ID</th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Email</th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Role</th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Active</th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ padding: 4 }}>{u.id}</td>
                <td style={{ padding: 4 }}>{u.email}</td>
                <td style={{ padding: 4 }}>{u.role ?? 'user'}</td>
                <td style={{ padding: 4 }}>{u.isActive ? 'Yes' : 'No'}</td>
                <td style={{ padding: 4 }}>
                  <button onClick={() => handleToggleActive(u.id)}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminPage;
