'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { workerApi } from './worker.api';

export function useWorkerProfileQuery() {
  return useQuery({
    queryKey: queryKeys.worker.me,
    queryFn: workerApi.getProfile,
  });
}
