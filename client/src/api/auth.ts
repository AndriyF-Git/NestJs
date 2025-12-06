import api from './api';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  recaptchaToken: string;
}

export async function login(data: LoginDto) {
  const res = await api.post('/auth/login', data);
  return res.data;
}

export async function register(data: RegisterDto) {
  const res = await api.post('/auth/register', data);
  return res.data;
}
