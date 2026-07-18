'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/entities/session/model/use-session-store';
import { queryKeys } from '@/shared/api/query-keys';
import { authApi } from './auth.api';
import type { LoginRequest, RegisterWorkerRequest } from './auth.types';

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const setSession = useSessionStore((state) => state.setSession);

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (session) => {
      setSession(session);
      queryClient.setQueryData(queryKeys.auth.me, session.user);
    },
  });
}

export function useRegisterWorkerMutation() {
  const queryClient = useQueryClient();
  const setSession = useSessionStore((state) => state.setSession);

  return useMutation({
    mutationFn: (data: RegisterWorkerRequest) => authApi.registerWorker(data),
    onSuccess: (session) => {
      setSession(session);
      queryClient.setQueryData(queryKeys.auth.me, session.user);
    },
  });
}
