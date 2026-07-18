import { apiRequest } from '@/shared/api/http-client';
import type { AuthResponse, LoginRequest, MeResponse, RegisterWorkerRequest } from './auth.types';

export const authApi = {
  login: (data: LoginRequest) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: data,
    }),
  registerWorker: (data: RegisterWorkerRequest) =>
    apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      auth: false,
      body: data,
    }),
  me: () =>
    apiRequest<MeResponse>('/auth/me', {
      method: 'GET',
    }),
};
