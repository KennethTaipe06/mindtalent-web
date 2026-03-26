import api from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EXAMINER' | 'CANDIDATE' | 'AUDITOR';
}

export interface LoginResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  localStorage.setItem('accessToken', data.tokens.accessToken);
  localStorage.setItem('refreshToken', data.tokens.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function register(userData: {
  email: string;
  password: string;
  cedula: string;
  firstName: string;
  lastName: string;
}) {
  const { data } = await api.post('/auth/register', userData);
  return data;
}

export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
}
