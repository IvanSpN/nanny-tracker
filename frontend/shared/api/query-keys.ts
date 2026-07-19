export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  worker: {
    dashboard: ['worker', 'dashboard'] as const,
  },
  clients: {
    all: ['clients'] as const,
    detail: (id: string) => ['clients', id] as const,
  },
};
