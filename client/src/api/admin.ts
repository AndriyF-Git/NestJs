import api from './api';

export interface AdminUser {
  id: number;
  email: string;
  isActive: boolean;
  twoFactorEnabled?: boolean;
  role?: 'user' | 'admin';
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const res = await api.get<AdminUser[]>('/admin/users');
  return res.data;
}

export async function toggleUserActive(id: number) {
  const res = await api.patch(`/admin/users/${id}/toggle-active`);
  return res.data as { message: string; userId: number; isActive: boolean };
}

export async function changeUserRole(
  id: number,
  role: 'user' | 'admin',
) {
  const res = await api.patch<{
    message: string;
    userId: number;
    role: 'user' | 'admin';
  }>(`/admin/users/${id}/role`, { role });
  return res.data;
}

export async function deleteUser(id: number) {
  const res = await api.delete<{ message: string }>(
    `/admin/users/${id}`,
  );
  return res.data;
}

export async function adminResetPassword(id: number) {
  const res = await api.post<{ message: string }>(
    `/admin/users/${id}/reset-password`,
  );
  return res.data;
}

export async function adminChangeEmail(id: number, newEmail: string) {
  const res = await api.patch<{
    message: string;
    userId: number;
    email: string;
  }>(`/admin/users/${id}/email`, { newEmail });
  return res.data;
}
