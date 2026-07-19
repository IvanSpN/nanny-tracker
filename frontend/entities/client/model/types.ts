export type WorkerClient = {
  id: string;
  name: string;
  regularRate: number;
  weekendRate: number | null;
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
  phone?: string | null;
  notes?: string | null;
};

export type CreateClientResponse = {
  client: WorkerClient;
  credentials: ClientCredentials;
};

export type ResetClientPasswordResponse = {
  credentials: ClientCredentials;
};
