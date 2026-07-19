'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { clientApi } from './client.api';

export function useClientsQuery() {
  return useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: clientApi.getClients,
  });
}
