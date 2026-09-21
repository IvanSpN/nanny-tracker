export type WorkSessionRateType = 'regular' | 'weekend';
export type WorkSessionStatus = 'pending' | 'confirmed' | 'rejected';

export type WorkSessionClient = {
  id: string;
  name: string;
};

export type WorkSession = {
  id: string;
  clientId: string;
  client: WorkSessionClient;
  workDate: string;
  startTime: string;
  endTime: string;
  workedMinutes: number;
  hours: number;
  rateType: WorkSessionRateType;
  rateValue: number;
  amount: number;
  comment: string | null;
  status: WorkSessionStatus;
  confirmedAt: string | null;
};

export type WorkSessionsRangeParams = {
  dateFrom: string;
  dateTo: string;
};

export type CreateWorkSessionPayload = {
  clientId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  rateType?: WorkSessionRateType;
  comment?: string | null;
};

export type UpdateWorkSessionPayload = Partial<CreateWorkSessionPayload>;

export type UpdateWorkSessionStatusPayload = {
  status: WorkSessionStatus;
};
