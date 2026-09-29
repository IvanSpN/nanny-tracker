export type WorkSessionRateType = 'regular' | 'weekend' | 'special';
export type WorkSessionStatus = 'pending' | 'confirmed' | 'rejected';

export type WorkSessionClient = {
  id: string;
  name: string;
};

export type WorkSessionExpense = {
  id: string;
  amount: number;
  description: string;
};

export type WorkSessionExpensePayload = {
  amount: string;
  description: string;
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
  /** Оплата за часы, без расходов. */
  amount: number;
  expenses: WorkSessionExpense[];
  expensesAmount: number;
  /** Итого за смену: оплата за часы + расходы. */
  totalAmount: number;
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
  expenses?: WorkSessionExpensePayload[];
};

export type UpdateWorkSessionPayload = Partial<CreateWorkSessionPayload>;

export type UpdateWorkSessionStatusPayload = {
  status: WorkSessionStatus;
};
