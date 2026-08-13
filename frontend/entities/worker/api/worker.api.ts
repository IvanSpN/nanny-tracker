import { apiRequest } from '@/shared/api/http-client';
import type { UpdateWorkerProfilePayload, WorkerProfile } from '../model/types';

export const workerApi = {
  getProfile: () => apiRequest<WorkerProfile>('/workers/me'),

  updateProfile: (payload: UpdateWorkerProfilePayload) =>
    apiRequest<WorkerProfile>('/workers/me', {
      method: 'PATCH',
      body: payload,
    }),
};
