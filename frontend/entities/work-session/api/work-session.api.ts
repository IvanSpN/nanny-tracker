import { apiRequest } from '@/shared/api/http-client';
import type {
  CreateWorkSessionPayload,
  UpdateWorkSessionPayload,
  UpdateWorkSessionStatusPayload,
  WorkSession,
  WorkSessionsRangeParams,
} from '../model/types';

type WorkSessionDto = {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
  };
  workDate: string;
  workedMinutes: number;
  hours: number;
  rateType: 'regular' | 'weekend';
  rateValue: string;
  amount: string;
  comment: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  confirmedAt: string | null;
};

export const workSessionApi = {
  getWorkSessions: async ({ dateFrom, dateTo }: WorkSessionsRangeParams) => {
    const params = new URLSearchParams({
      dateFrom,
      dateTo,
    });
    const workSessions = await apiRequest<unknown>(`/work-sessions?${params.toString()}`);

    if (!Array.isArray(workSessions)) {
      throw new Error(
        'Backend вернул неожиданный формат списка смен. Проверь, что backend перезапущен после обновления work-sessions.',
      );
    }

    return workSessions.map(parseWorkSession);
  },

  createWorkSession: async (payload: CreateWorkSessionPayload) => {
    const workSession = await apiRequest<unknown>('/work-sessions', {
      method: 'POST',
      body: payload,
    });

    return parseWorkSession(workSession);
  },

  updateWorkSession: async (id: string, payload: UpdateWorkSessionPayload) => {
    const workSession = await apiRequest<unknown>(`/work-sessions/${id}`, {
      method: 'PATCH',
      body: payload,
    });

    return parseWorkSession(workSession);
  },

  updateWorkSessionStatus: async (id: string, payload: UpdateWorkSessionStatusPayload) => {
    const workSession = await apiRequest<unknown>(`/work-sessions/${id}/status`, {
      method: 'PATCH',
      body: payload,
    });

    return parseWorkSession(workSession);
  },

  deleteWorkSession: (id: string) =>
    apiRequest<null>(`/work-sessions/${id}`, {
      method: 'DELETE',
    }),
};

function mapWorkSession(workSession: WorkSessionDto): WorkSession {
  return {
    ...workSession,
    rateValue: Number(workSession.rateValue),
    amount: Number(workSession.amount),
  };
}

function parseWorkSession(value: unknown): WorkSession {
  if (!isWorkSessionDto(value)) {
    throw new Error('Backend вернул смену в неожиданном формате.');
  }

  return mapWorkSession(value);
}

function isWorkSessionDto(value: unknown): value is WorkSessionDto {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.clientId === 'string' &&
    isRecord(value.client) &&
    typeof value.client.id === 'string' &&
    typeof value.client.name === 'string' &&
    typeof value.workDate === 'string' &&
    typeof value.workedMinutes === 'number' &&
    typeof value.hours === 'number' &&
    (value.rateType === 'regular' || value.rateType === 'weekend') &&
    typeof value.rateValue === 'string' &&
    typeof value.amount === 'string' &&
    (typeof value.comment === 'string' || value.comment === null) &&
    (value.status === 'pending' || value.status === 'confirmed' || value.status === 'rejected') &&
    (typeof value.confirmedAt === 'string' || value.confirmedAt === null)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
