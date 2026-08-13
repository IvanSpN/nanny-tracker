'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { workerApi } from './worker.api';
import type { UpdateWorkerProfilePayload } from '../model/types';

export function useUpdateWorkerProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateWorkerProfilePayload) => workerApi.updateProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.worker.me, profile);
    },
  });
}
