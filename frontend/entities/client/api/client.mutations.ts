'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { clientApi } from './client.api';
import type { CreateClientPayload, UpdateClientPayload, WorkerClient } from '../model/types';

export function useCreateClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateClientPayload) => clientApi.createClient(payload),
    onSuccess: (response) => {
      queryClient.setQueryData<WorkerClient[]>(queryKeys.clients.all, (clients = []) => [
        response.client,
        ...clients.filter((client) => client.id !== response.client.id),
      ]);

      void queryClient.invalidateQueries({
        queryKey: queryKeys.clients.all,
      });
    },
  });
}

export function useResetClientPasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => clientApi.resetPassword(clientId),
    onSuccess: (_response, clientId) => {
      queryClient.setQueryData<WorkerClient[]>(queryKeys.clients.all, (clients = []) =>
        clients.map((client) =>
          client.id === clientId
            ? {
                ...client,
                isInitialPasswordChanged: false,
              }
            : client,
        ),
      );
    },
  });
}

export function useUpdateClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, payload }: { clientId: string; payload: UpdateClientPayload }) =>
      clientApi.updateClient(clientId, payload),
    onSuccess: (updatedClient) => {
      queryClient.setQueryData<WorkerClient[]>(queryKeys.clients.all, (clients = []) =>
        clients.map((client) => (client.id === updatedClient.id ? updatedClient : client)),
      );

      void queryClient.invalidateQueries({
        queryKey: queryKeys.clients.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workSessions.all,
      });
    },
  });
}
