'use client';

import { useQuery } from '@tanstack/react-query';
import { Banknote, CalendarRange, Clock3, WalletCards } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { queryKeys } from '@/shared/api/query-keys';
import { getWeekDays, parseDate, toDateKey } from '@/shared/lib/date';
import { formatHours, formatMoney } from '@/shared/lib/money';
import { getWorkerDashboard } from '@/shared/mock/api';
import { mockDashboard } from '@/shared/mock/dashboard';
import type { Client, Shift } from '@/shared/types/domain';

const weekStart = parseDate('2026-07-13');
const weekKeys = new Set(getWeekDays(weekStart).map(toDateKey));

export function StatisticsScreen() {
  const { data = mockDashboard } = useQuery({
    queryKey: queryKeys.worker.dashboard,
    queryFn: getWorkerDashboard,
  });
  const confirmedShifts = data.shifts.filter((shift) => shift.status === 'confirmed');
  const weekShifts = confirmedShifts.filter((shift) => weekKeys.has(shift.date));
  const monthShifts = confirmedShifts.filter((shift) => shift.date.startsWith('2026-07'));
  const paid = sum(data.payments.map((payment) => payment.amount));
  const monthAccrued = sum(monthShifts.map(shiftAmount));
  const balance = monthAccrued - paid;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
      <div className="mb-4">
        <p className="text-sm font-medium text-muted-foreground">Статистика</p>
        <h1 className="text-2xl font-semibold tracking-normal">Итоги по времени и оплате</h1>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatMetric
          icon={Clock3}
          title="Неделя"
          value={formatHours(sum(weekShifts.map((shift) => shift.actualHours)))}
        />
        <StatMetric
          icon={Banknote}
          title="За неделю"
          value={formatMoney(sum(weekShifts.map(shiftAmount)))}
        />
        <StatMetric icon={WalletCards} title="Оплачено" value={formatMoney(paid)} />
        <StatMetric icon={CalendarRange} title="Остаток" value={formatMoney(balance)} />
      </div>

      <Tabs defaultValue="week" className="gap-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-80">
          <TabsTrigger value="week">Неделя</TabsTrigger>
          <TabsTrigger value="month">Месяц</TabsTrigger>
        </TabsList>

        <TabsContent value="week">
          <Breakdown shifts={weekShifts} clients={data.clients} />
        </TabsContent>
        <TabsContent value="month">
          <Breakdown shifts={monthShifts} clients={data.clients} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function StatMetric({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Breakdown({ shifts, clients }: { shifts: Shift[]; clients: Client[] }) {
  const rows = clients
    .map((client) => {
      const clientShifts = shifts.filter((shift) => shift.clientId === client.id);
      const hours = sum(clientShifts.map((shift) => shift.actualHours));
      const amount = sum(clientShifts.map(shiftAmount));

      return {
        client,
        hours,
        amount,
      };
    })
    .filter((row) => row.hours > 0);
  const totalHours = sum(rows.map((row) => row.hours));
  const totalAmount = sum(rows.map((row) => row.amount));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Разбивка по клиентам</h2>
          <Badge variant="secondary">{formatMoney(totalAmount)}</Badge>
        </div>

        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.client.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{row.client.name}</p>
                  <p className="text-sm text-muted-foreground">{formatHours(row.hours)}</p>
                </div>
                <p className="font-semibold">{formatMoney(row.amount)}</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.max(8, (row.amount / Math.max(totalAmount, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 text-lg font-semibold">Сводка</h2>
        <div className="space-y-3">
          <SummaryLine label="Подтверждённые часы" value={formatHours(totalHours)} />
          <SummaryLine label="Начислено" value={formatMoney(totalAmount)} />
          <SummaryLine
            label="Средняя ставка"
            value={formatMoney(totalHours > 0 ? totalAmount / totalHours : 0)}
          />
        </div>
      </section>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function shiftAmount(shift: Shift) {
  return shift.actualHours * shift.hourlyRateSnapshot;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
