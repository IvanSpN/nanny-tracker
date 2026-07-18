export type Client = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  regularRate: number;
  weekendRate: number;
  isActive: boolean;
  credentialsStatus: 'initial' | 'changed';
};

export type RateType = 'regular' | 'holiday';
export type ShiftStatus = 'planned' | 'confirmed';

export type Shift = {
  id: string;
  clientId: string;
  date: string;
  plannedHours: number;
  actualHours: number;
  status: ShiftStatus;
  rateType: RateType;
  hourlyRateSnapshot: number;
  notes?: string;
};

export type Payment = {
  id: string;
  clientId: string;
  date: string;
  amount: number;
  type: 'advance' | 'payment';
  notes?: string;
};

export type WorkerDashboard = {
  clients: Client[];
  shifts: Shift[];
  payments: Payment[];
};
