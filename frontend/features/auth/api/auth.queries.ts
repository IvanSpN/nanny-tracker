'use client';

import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '@/entities/session/model/use-session-store';
import { queryKeys } from '@/shared/api/query-keys';
import { authApi } from './auth.api';

export function useMeQuery() {
  const accessToken = useSessionStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.me,
    enabled: Boolean(accessToken),
    retry: false,
  });
}
