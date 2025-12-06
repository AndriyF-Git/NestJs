import api from './api';

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export async function requestPasswordReset(data: ForgotPasswordDto) {
  const res = await api.post('/auth/forgot-password', data);
  return res.data;
}

export async function resetPassword(data: ResetPasswordDto) {
  const res = await api.post('/auth/reset-password', data);
  return res.data;
}
