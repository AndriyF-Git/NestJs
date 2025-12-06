import api from './api';

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user?: {
    id: number;
    email: string;
  };
  accessToken?: string;
  twoFactorRequired?: boolean;
  twoFactorCode?: string; // буде тільки в dev
}

export interface TwoFactorVerifyDto {
  email: string;
  code: string;
}

export interface TwoFactorToggleDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  recaptchaToken: string;
}

export async function verifyTwoFactorLogin(
  data: TwoFactorVerifyDto,
): Promise<LoginResponse> {
  const res = await api.post('/auth/login/2fa', data);
  return res.data;
}

export async function enableTwoFactor(data: TwoFactorToggleDto) {
  const res = await api.post('/auth/2fa/enable', data);
  return res.data;
}

export async function disableTwoFactor(data: TwoFactorToggleDto) {
  const res = await api.post('/auth/2fa/disable', data);
  return res.data;
}

export async function login(data: LoginDto) {
  const res = await api.post('/auth/login', data);
  return res.data;
}

export async function register(data: RegisterDto) {
  const res = await api.post('/auth/register', data);
  return res.data;
}
