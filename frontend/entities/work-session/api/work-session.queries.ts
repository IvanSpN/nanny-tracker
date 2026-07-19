'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { workSessionApi } from './work-session.api';
import type { WorkSessionsRangeParams } from '../model/types';

export function useWorkSessionsQuery(params: WorkSessionsRangeParams) {
  return useQuery({
    queryKey: queryKeys.workSessions.range(params.dateFrom, params.dateTo),
    queryFn: () => workSessionApi.getWorkSessions(params),
  });
}
