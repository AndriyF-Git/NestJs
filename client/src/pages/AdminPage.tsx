import React, {
  useEffect,
  useState,
  useCallback,
} from 'react';
import axios from 'axios';
import {
  fetchAdminUsers,
  toggleUserActive,
  changeUserRole,
  deleteUser,
  adminResetPassword,
  adminChangeEmail,
} from '../api/admin';
import type { AdminUser } from '../api/admin';
import { useNavigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // фільтри та пошук
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // вибраний користувач для детального керування
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async () => {
    setError(null);
    setActionMessage(null);
    setLoading(true);

    try {
      const data = await fetchAdminUsers();
      setUsers(data);
      // якщо вибраний юзер вже не існує (його видалили) — скинемо
      setSelectedUser((prev) =>
        prev ? data.find((u) => u.id === prev.id) ?? null : null,
      );
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

      setSelectedUser((prev) =>
        prev && prev.id === id ? { ...prev, isActive: res.isActive } : prev,
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

  const handleToggleRole = async (user: AdminUser) => {
    const newRole: 'user' | 'admin' = user.role === 'admin' ? 'user' : 'admin';
    try {
      const res = await changeUserRole(user.id, newRole);
      setActionMessage(res.message);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, role: res.role } : u,
        ),
      );

      setSelectedUser((prev) =>
        prev && prev.id === user.id ? { ...prev, role: res.role } : prev,
      );
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ||
          'Failed to update user role.';
        setError(msg);
      } else {
        setError('Unexpected error while updating user role.');
      }
    }
  };

  const handleDeleteUser = async (id: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this user?',
    );
    if (!confirmed) return;

    try {
      const res = await deleteUser(id);
      setActionMessage(res.message);

      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSelectedUser((prev) => (prev && prev.id === id ? null : prev));
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ||
          'Failed to delete user.';
        setError(msg);
      } else {
        setError('Unexpected error while deleting user.');
      }
    }
  };

  const handleResetPassword = async (id: number) => {
    try {
      const res = await adminResetPassword(id);
      setActionMessage(res.message);
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ||
          'Failed to send password reset email.';
        setError(msg);
      } else {
        setError('Unexpected error while sending reset email.');
      }
    }
  };

  const handleChangeEmail = async (user: AdminUser) => {
    const newEmail = window.prompt(
      `Enter new email for user ${user.email}:`,
      user.email,
    );
    if (!newEmail || newEmail === user.email) return;

    try {
      const res = await adminChangeEmail(user.id, newEmail);
      setActionMessage(res.message);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, email: res.email } : u,
        ),
      );

      setSelectedUser((prev) =>
        prev && prev.id === user.id ? { ...prev, email: res.email } : prev,
      );
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ||
          'Failed to change user email.';
        setError(msg);
      } else {
        setError('Unexpected error while changing email.');
      }
    }
  };

  // застосовуємо пошук + фільтри
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'all' ? true : (u.role ?? 'user') === roleFilter;

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
          ? u.isActive
          : !u.isActive;

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return <div style={{ padding: 20 }}>Loading admin panel...</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto' }}>
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

      {/* Панель фільтрів */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        />

        <select
          value={roleFilter}
          onChange={(e) =>
            setRoleFilter(e.target.value as 'all' | 'user' | 'admin')
          }
        >
          <option value="all">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as 'all' | 'active' | 'inactive',
            )
          }
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {filteredUsers.length === 0 ? (
        <p>No users match current filters.</p>
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
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                ID
              </th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                Email
              </th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                Role
              </th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                Active
              </th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr
                key={u.id}
                style={{
                  backgroundColor:
                    selectedUser?.id === u.id ? '#f0f8ff' : 'transparent',
                }}
              >
                <td style={{ padding: 4 }}>{u.id}</td>
                <td style={{ padding: 4 }}>{u.email}</td>
                <td style={{ padding: 4 }}>{u.role ?? 'user'}</td>
                <td style={{ padding: 4 }}>{u.isActive ? 'Yes' : 'No'}</td>
                <td style={{ padding: 4 }}>
                  <button
                    onClick={() => handleToggleActive(u.id)}
                    style={{ marginRight: 4 }}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleToggleRole(u)}
                    style={{ marginRight: 4 }}
                  >
                    {u.role === 'admin' ? 'Make user' : 'Make admin'}
                  </button>
                  <button onClick={() => setSelectedUser(u)}>
                    {selectedUser?.id === u.id ? 'Selected' : 'Manage'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Панель керування вибраним користувачем */}
      {selectedUser && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: '1px solid #ddd',
            borderRadius: 8,
            background: '#fafafa',
          }}
        >
          <h3>Manage user</h3>
          <p>
            <strong>ID:</strong> {selectedUser.id}
          </p>
          <p>
            <strong>Email:</strong> {selectedUser.email}
          </p>
          <p>
            <strong>Role:</strong> {selectedUser.role ?? 'user'}
          </p>
          <p>
            <strong>Active:</strong>{' '}
            {selectedUser.isActive ? 'Yes' : 'No'}
          </p>

          <div
            style={{
              marginTop: 12,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <button onClick={() => handleResetPassword(selectedUser.id)}>
              Send password reset email
            </button>
            <button onClick={() => handleChangeEmail(selectedUser)}>
              Change email
            </button>
            <button
              onClick={() => handleDeleteUser(selectedUser.id)}
              style={{ backgroundColor: '#c00', color: '#fff' }}
            >
              Delete user
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
