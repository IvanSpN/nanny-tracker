'use client';

import { Banknote, CalendarRange, Clock3, WalletCards } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClientsQuery } from '@/entities/client/api/client.queries';
import type { WorkerClient } from '@/entities/client/model/types';
import { useWorkSessionsQuery } from '@/entities/work-session/api/work-session.queries';
import type { WorkSession } from '@/entities/work-session/model/types';
import { getApiErrorMessage } from '@/shared/api/http-client';
import { addDays, getWeekDays, toDateKey } from '@/shared/lib/date';
import { formatHours, formatMoney } from '@/shared/lib/money';

const monthFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
});

export function StatisticsScreen() {
  const today = new Date();
  const weekStart = getStartOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const dateFrom = toDateKey(minDate(weekStart, monthStart));
  const dateTo = toDateKey(maxDate(weekEnd, monthEnd));
  const weekKeys = new Set(getWeekDays(weekStart).map(toDateKey));
  const monthKey = toDateKey(monthStart).slice(0, 7);
  const monthLabel = monthFormatter.format(today);
  const clientsQuery = useClientsQuery();
  const workSessionsQuery = useWorkSessionsQuery({ dateFrom, dateTo });
  const clients = clientsQuery.data ?? [];
  const sessions = workSessionsQuery.data ?? [];
  const confirmedSessions = sessions.filter((session) => session.status === 'confirmed');
  const weekSessions = confirmedSessions.filter((session) => weekKeys.has(session.workDate));
  const monthSessions = confirmedSessions.filter((session) =>
    session.workDate.startsWith(monthKey),
  );

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
          value={formatHours(sum(weekSessions.map((session) => session.hours)))}
        />
        <StatMetric
          icon={Banknote}
          title="За неделю"
          value={formatMoney(sum(weekSessions.map((session) => session.amount)))}
        />
        <StatMetric
          icon={WalletCards}
          title={capitalize(monthLabel)}
          value={formatHours(sum(monthSessions.map((session) => session.hours)))}
        />
        <StatMetric
          icon={CalendarRange}
          title="За месяц"
          value={formatMoney(sum(monthSessions.map((session) => session.amount)))}
        />
      </div>

      {(clientsQuery.isError || workSessionsQuery.isError) && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {clientsQuery.isError && <p>{getApiErrorMessage(clientsQuery.error)}</p>}
          {workSessionsQuery.isError && <p>{getApiErrorMessage(workSessionsQuery.error)}</p>}
        </div>
      )}

      <Tabs defaultValue="week" className="gap-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-80">
          <TabsTrigger value="week">Неделя</TabsTrigger>
          <TabsTrigger value="month">Месяц</TabsTrigger>
        </TabsList>

        <TabsContent value="week">
          <Breakdown
            sessions={weekSessions}
            clients={clients}
            isLoading={workSessionsQuery.isLoading}
          />
        </TabsContent>
        <TabsContent value="month">
          <Breakdown
            sessions={monthSessions}
            clients={clients}
            isLoading={workSessionsQuery.isLoading}
          />
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

function Breakdown({
  sessions,
  clients,
  isLoading,
}: {
  sessions: WorkSession[];
  clients: WorkerClient[];
  isLoading: boolean;
}) {
  const rows = clients
    .map((client) => {
      const clientSessions = sessions.filter((session) => session.clientId === client.id);
      const hours = sum(clientSessions.map((session) => session.hours));
      const amount = sum(clientSessions.map((session) => session.amount));

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
          {isLoading && (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Загружаем статистику...
            </p>
          )}

          {!isLoading && rows.length === 0 && (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              За выбранный период нет подтверждённых смен.
            </p>
          )}

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

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getStartOfWeek(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), diff);
}

function minDate(first: Date, second: Date) {
  return first < second ? first : second;
}

function maxDate(first: Date, second: Date) {
  return first > second ? first : second;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
