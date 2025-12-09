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
