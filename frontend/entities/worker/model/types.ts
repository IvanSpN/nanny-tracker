export type WorkerProfile = {
  id: string;
  name: string;
  phone: string | null;
  defaultRegularRate: string | null;
  defaultWeekendRate: string | null;
  isActive: boolean;
};

export type UpdateWorkerProfilePayload = {
  name: string;
};
