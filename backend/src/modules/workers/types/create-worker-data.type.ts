export type CreateWorkerData = {
  userId: string;
  name: string;
  phone?: string | null;
  defaultRegularRate?: string | null;
  defaultWeekendRate?: string | null;
};
