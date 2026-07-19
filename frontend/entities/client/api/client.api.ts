import { apiRequest } from '@/shared/api/http-client';
import type {
  ClientCredentials,
  CreateClientPayload,
  CreateClientResponse,
  ResetClientPasswordResponse,
  WorkerClient,
} from '../model/types';

type WorkerClientDto = {
  id: string;
  name: string;
  regularRate: string;
  weekendRate: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  isInitialPasswordChanged: boolean;
};

type CreateClientResponseDto = {
  client: WorkerClientDto;
  credentials: ClientCredentials;
};

export const clientApi = {
  getClients: async () => {
    const clients = await apiRequest<WorkerClientDto[]>('/clients');

    return clients.map(mapClient);
  },

  createClient: async (payload: CreateClientPayload): Promise<CreateClientResponse> => {
    const response = await apiRequest<CreateClientResponseDto>('/clients', {
      method: 'POST',
      body: payload,
    });

    return {
      client: mapClient(response.client),
      credentials: response.credentials,
    };
  },

  resetPassword: (clientId: string) =>
    apiRequest<ResetClientPasswordResponse>(`/clients/${clientId}/reset-password`, {
      method: 'POST',
    }),
};

function mapClient(client: WorkerClientDto): WorkerClient {
  return {
    ...client,
    regularRate: Number(client.regularRate),
    weekendRate: client.weekendRate === null ? null : Number(client.weekendRate),
  };
}
