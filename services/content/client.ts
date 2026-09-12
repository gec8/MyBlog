import { apiRequest } from '@/services/api-client';

export function createContentClient(token: string) {
  return {
    request: <T>(path: string, options: RequestInit = {}) => apiRequest<T>(path, options, token),
  };
}
