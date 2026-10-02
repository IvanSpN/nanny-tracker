'use client';

import * as React from 'react';
import { Banknote, ChevronDown, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkSessionsQuery } from '@/entities/work-session/api/work-session.queries';
import type { WorkSession } from '@/entities/work-session/model/types';
import { getApiErrorMessage } from '@/shared/api/http-client';
import { addDays, formatDayRange, toDateKey } from '@/shared/lib/date';
import { formatHours, formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';

const monthFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
});

const MONTH_NAMES = Array.from({ length: 12 }, (_, index) =>
  capitalize(monthFormatter.format(new Date(2000, index, 1))),
);

export function StatisticsScreen() {
  const currentMonth = React.useMemo(() => getMonthStart(new Date()), []);
  // Выбранный месяц храним здесь, чтобы он не сбрасывался при переключении вкладок.
  const [selectedMonth, setSelectedMonth] = React.useState(currentMonth);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
      <div className="mb-4">
        <p className="text-sm font-medium text-muted-foreground">Статистика</p>
        <h1 className="text-2xl font-semibold tracking-normal">Итоги по времени и оплате</h1>
      </div>

      <Tabs defaultValue="week" className="gap-4">
        <TabsList className="grid h-12 w-full grid-cols-2 border border-border sm:w-80">
          <TabsTrigger value="week" className="h-10 text-base">
            Неделя
          </TabsTrigger>
          <TabsTrigger value="month" className="h-10 text-base">
            Месяц
          </TabsTrigger>
        </TabsList>

        <TabsContent value="week">
          <WeekStatistics />
        </TabsContent>
        <TabsContent value="month">
          <MonthStatistics
            month={selectedMonth}
            currentMonth={currentMonth}
            onMonthChange={setSelectedMonth}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function WeekStatistics() {
  const weekStart = React.useMemo(() => getStartOfWeek(new Date()), []);
  const weekEnd = addDays(weekStart, 6);
  const workSessionsQuery = useWorkSessionsQuery({
    dateFrom: toDateKey(weekStart),
    dateTo: toDateKey(weekEnd),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">Текущая неделя</p>
        <p className="text-lg font-semibold">{formatDayRange(weekStart, weekEnd)}</p>
      </div>

      <PeriodStatistics
        sessions={workSessionsQuery.data ?? []}
        isLoading={workSessionsQuery.isLoading}
        error={workSessionsQuery.error}
      />
    </div>
  );
}

function MonthStatistics({
  month,
  currentMonth,
  onMonthChange,
}: {
  month: Date;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const workSessionsQuery = useWorkSessionsQuery({
    dateFrom: toDateKey(month),
    dateTo: toDateKey(monthEnd),
  });
  const isCurrentMonth = month.getTime() === currentMonth.getTime();

  // Будущие месяцы не показываем: подтверждённых смен там ещё нет.
  const goToMonth = (next: Date) => {
    if (next <= currentMonth) {
      onMonthChange(next);
    }
  };

  return (
    <div
      className="space-y-4"
      // Свайп влево-вправо листает месяцы, как недели в расписании.
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const touch = event.changedTouches[0];
        touchStart.current = null;

        // Касания внутри шторки тоже долетают сюда через портал — там свайп не нужен.
        if (!start || !touch || isPickerOpen) {
          return;
        }

        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;

        if (Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY)) {
          goToMonth(addMonths(month, deltaX < 0 ? 1 : -1));
        }
      }}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:max-w-md">
        <Button
          variant="outline"
          size="icon"
          className="size-12 [&_svg]:size-5"
          aria-label="Предыдущий месяц"
          onClick={() => goToMonth(addMonths(month, -1))}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          className="h-12 min-w-0 text-base font-semibold"
          aria-haspopup="dialog"
          onClick={() => setIsPickerOpen(true)}
        >
          <span className="truncate">{formatMonthLabel(month)}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-12 [&_svg]:size-5"
          aria-label="Следующий месяц"
          disabled={isCurrentMonth}
          onClick={() => goToMonth(addMonths(month, 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      <MonthPickerDialog
        open={isPickerOpen}
        month={month}
        currentMonth={currentMonth}
        onOpenChange={setIsPickerOpen}
        onSelect={(next) => {
          goToMonth(next);
          setIsPickerOpen(false);
        }}
      />

      <PeriodStatistics
        sessions={workSessionsQuery.data ?? []}
        isLoading={workSessionsQuery.isLoading}
        error={workSessionsQuery.error}
      />
    </div>
  );
}

function MonthPickerDialog({
  open,
  month,
  currentMonth,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  month: Date;
  currentMonth: Date;
  onOpenChange: (open: boolean) => void;
  onSelect: (month: Date) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Выбери месяц</DialogTitle>
        </DialogHeader>
        {/* Содержимое монтируется при каждом открытии — год стартует с выбранного месяца. */}
        <MonthPicker month={month} currentMonth={currentMonth} onSelect={onSelect} />
      </DialogContent>
    </Dialog>
  );
}

function MonthPicker({
  month,
  currentMonth,
  onSelect,
}: {
  month: Date;
  currentMonth: Date;
  onSelect: (month: Date) => void;
}) {
  const [year, setYear] = React.useState(month.getFullYear());
  const currentYear = currentMonth.getFullYear();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-12 [&_svg]:size-5"
          aria-label="Предыдущий год"
          onClick={() => setYear((current) => current - 1)}
        >
          <ChevronLeft />
        </Button>
        <p className="text-center text-lg font-semibold">{year}</p>
        <Button
          variant="outline"
          size="icon"
          className="size-12 [&_svg]:size-5"
          aria-label="Следующий год"
          disabled={year >= currentYear}
          onClick={() => setYear((current) => current + 1)}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MONTH_NAMES.map((name, index) => {
          const option = new Date(year, index, 1);
          const isSelected = option.getTime() === month.getTime();
          const isCurrent = option.getTime() === currentMonth.getTime();

          return (
            <Button
              key={name}
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'h-12 px-2 text-base',
                isSelected && 'border border-primary',
                isCurrent && !isSelected && 'border-primary/50 text-primary',
              )}
              disabled={option > currentMonth}
              aria-current={isSelected ? 'date' : undefined}
              onClick={() => onSelect(option)}
            >
              {name}
            </Button>
          );
        })}
      </div>

      <Button
        variant="outline"
        className="h-12 w-full text-base"
        disabled={month.getTime() === currentMonth.getTime()}
        onClick={() => onSelect(currentMonth)}
      >
        Текущий месяц
      </Button>
    </div>
  );
}

function PeriodStatistics({
  sessions,
  isLoading,
  error,
}: {
  sessions: WorkSession[];
  isLoading: boolean;
  error: Error | null;
}) {
  const confirmedSessions = sessions.filter((session) => session.status === 'confirmed');
  const totalHours = sum(confirmedSessions.map((session) => session.hours));
  const totalAmount = sum(confirmedSessions.map((session) => session.totalAmount));

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p>{getApiErrorMessage(error)}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <StatMetric icon={Clock3} title="Часы" value={isLoading ? '—' : formatHours(totalHours)} />
        <StatMetric
          icon={Banknote}
          title="Доход"
          value={isLoading ? '—' : formatMoney(totalAmount)}
        />
      </div>

      <Breakdown sessions={confirmedSessions} isLoading={isLoading} />
    </div>
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

function Breakdown({ sessions, isLoading }: { sessions: WorkSession[]; isLoading: boolean }) {
  // Группируем по сменам, а не по списку клиентов: в прошлых месяцах
  // могут быть клиенты, которых в текущем списке уже нет.
  const rows = Array.from(groupByClient(sessions).values())
    .map(({ client, sessions: clientSessions }) => ({
      client,
      hours: sum(clientSessions.map((session) => session.hours)),
      amount: sum(clientSessions.map((session) => session.totalAmount)),
      salaryAmount: sum(clientSessions.map((session) => session.amount)),
    }))
    .filter((row) => row.hours > 0)
    .sort((first, second) => second.amount - first.amount);
  const totalHours = sum(rows.map((row) => row.hours));
  const totalAmount = sum(rows.map((row) => row.amount));
  // Средняя ставка — только по оплате за часы, без расходов няни.
  const totalSalaryAmount = sum(rows.map((row) => row.salaryAmount));

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
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.client.name}</p>
                  <p className="text-sm text-muted-foreground">{formatHours(row.hours)}</p>
                </div>
                <p className="shrink-0 font-semibold">{formatMoney(row.amount)}</p>
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
            value={formatMoney(totalHours > 0 ? totalSalaryAmount / totalHours : 0)}
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

function groupByClient(sessions: WorkSession[]) {
  const groups = new Map<string, { client: WorkSession['client']; sessions: WorkSession[] }>();

  for (const session of sessions) {
    const group = groups.get(session.clientId);

    if (group) {
      group.sessions.push(session);
    } else {
      groups.set(session.clientId, { client: session.client, sessions: [session] });
    }
  }

  return groups;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getStartOfWeek(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), diff);
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatMonthLabel(date: Date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
