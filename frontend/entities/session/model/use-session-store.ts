'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, SessionUser } from './types';

type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  hasHydrated: boolean;
  setSession: (session: AuthSession) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: SessionUser | null) => void;
  clearSession: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hasHydrated: false,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
        }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'nanny-tracker-session',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setUser(null);
        state?.setHasHydrated(true);
      },
    },
  ),
);
