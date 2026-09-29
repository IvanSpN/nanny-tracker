import { formatMoney } from '@/shared/lib/money';
import type { WorkSessionExpense } from '../model/types';

/** «Вода — 300 KZT, площадка — 1 000 KZT» */
export function formatExpenses(expenses: WorkSessionExpense[]) {
  return expenses
    .map((expense) => `${expense.description} — ${formatMoney(expense.amount)}`)
    .join(', ');
}
