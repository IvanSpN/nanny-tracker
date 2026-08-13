export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  worker: {
    dashboard: ['worker', 'dashboard'] as const,
    me: ['worker', 'me'] as const,
  },
  clients: {
    all: ['clients'] as const,
    me: ['clients', 'me'] as const,
    detail: (id: string) => ['clients', id] as const,
  },
  workSessions: {
    all: ['work-sessions'] as const,
    range: (dateFrom: string, dateTo: string) => ['work-sessions', { dateFrom, dateTo }] as const,
    detail: (id: string) => ['work-sessions', id] as const,
  },
};
