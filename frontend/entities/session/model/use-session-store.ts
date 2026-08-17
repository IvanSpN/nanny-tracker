'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, SessionUser } from './types';

type SessionState = {
  accessToken: string | null;
  user: SessionUser | null;
  hasHydrated: boolean;
  setSession: (session: AuthSession) => void;
  setUser: (user: SessionUser | null) => void;
  clearSession: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      hasHydrated: false,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          user: session.user,
        }),
      setUser: (user) => set({ user }),
      clearSession: () =>
        set({
          accessToken: null,
          user: null,
        }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'nanny-tracker-session',
      partialize: (state) => ({
        accessToken: state.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setUser(null);
        state?.setHasHydrated(true);
      },
    },
  ),
);
