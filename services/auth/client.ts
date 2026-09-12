import { apiRequest } from '@/services/api-client';
import type { AdminUser } from '@/types/blog';

export type AuthSession = { token: string; user: AdminUser };

export const authClient = {
  login: (username: string, password: string) =>
    apiRequest<AuthSession>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: (token: string) => apiRequest<{ user: AdminUser }>('/api/auth/me', {}, token),
  logout: (token: string) => apiRequest<{ ok: true }>('/api/auth/logout', { method: 'POST' }, token),
  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    apiRequest<{ ok: true; relogin: boolean }>('/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, token),
};
