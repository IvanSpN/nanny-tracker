export type ClientSpecialDay = {
  weekday: number;
  rate: number;
};

export type WorkerClient = {
  id: string;
  name: string;
  regularRate: number;
  weekendRate: number | null;
  specialDays: ClientSpecialDay[];
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  isInitialPasswordChanged: boolean;
};

export type ClientCredentials = {
  login: string;
  password: string;
};

export type CreateClientPayload = {
  name: string;
  regularRate: string;
  weekendRate?: string | null;
  specialDays?: { weekday: number; rate: string }[];
  phone?: string | null;
  notes?: string | null;
};

export type UpdateClientPayload = Partial<CreateClientPayload>;

export type CreateClientResponse = {
  client: WorkerClient;
  credentials: ClientCredentials;
};

export type ResetClientPasswordResponse = {
  credentials: ClientCredentials;
};
