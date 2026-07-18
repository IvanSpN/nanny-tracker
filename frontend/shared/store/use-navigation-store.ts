'use client';

import { create } from 'zustand';

export type WorkerTab = 'schedule' | 'clients' | 'stats' | 'profile';
export type ClientTab = 'overview' | 'history' | 'profile';

type NavigationState = {
  workerTab: WorkerTab;
  clientTab: ClientTab;
  setWorkerTab: (tab: WorkerTab) => void;
  setClientTab: (tab: ClientTab) => void;
  resetNavigation: () => void;
};

export const useNavigationStore = create<NavigationState>((set) => ({
  workerTab: 'schedule',
  clientTab: 'overview',
  setWorkerTab: (workerTab) => set({ workerTab }),
  setClientTab: (clientTab) => set({ clientTab }),
  resetNavigation: () =>
    set({
      workerTab: 'schedule',
      clientTab: 'overview',
    }),
}));
