'use client';

import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { workSessionApi } from './work-session.api';
import type {
  CreateWorkSessionPayload,
  UpdateWorkSessionPayload,
  UpdateWorkSessionStatusPayload,
} from '../model/types';

export function useCreateWorkSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWorkSessionPayload) => workSessionApi.createWorkSession(payload),
    onSuccess: () => invalidateWorkSessions(queryClient),
  });
}

export function useUpdateWorkSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWorkSessionPayload }) =>
      workSessionApi.updateWorkSession(id, payload),
    onSuccess: () => invalidateWorkSessions(queryClient),
  });
}

export function useUpdateWorkSessionStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWorkSessionStatusPayload }) =>
      workSessionApi.updateWorkSessionStatus(id, payload),
    onSuccess: () => invalidateWorkSessions(queryClient),
  });
}

export function useDeleteWorkSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workSessionApi.deleteWorkSession(id),
    onSuccess: () => invalidateWorkSessions(queryClient),
  });
}

function invalidateWorkSessions(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.workSessions.all,
  });
}
