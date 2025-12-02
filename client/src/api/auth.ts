import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000', // NestJS
});

export interface LoginDto {
  email: string;
  password: string;
  // якщо є ще поля (captcha, 2FA code) – додаси сюди
}

export interface RegisterDto {
  email: string;
  password: string;
  // наприклад name, username тощо – додаси пізніше
}

export async function login(data: LoginDto) {
  const res = await api.post('/auth/login', data);
  return res.data; // припускаю, що тут буде { accessToken, ... }
}

export async function register(data: RegisterDto) {
  const res = await api.post('/auth/register', data);
  return res.data;
}
