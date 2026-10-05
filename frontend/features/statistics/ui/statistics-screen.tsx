'use client';

import * as React from 'react';
import { Banknote, ChevronDown, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingStatus } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkSessionsQuery } from '@/entities/work-session/api/work-session.queries';
import { formatExpenses } from '@/entities/work-session/lib/format-expenses';
import type { WorkSession, WorkSessionClient } from '@/entities/work-session/model/types';
import { getApiErrorMessage } from '@/shared/api/http-client';
import {
  addDays,
  addWeeks,
  formatDay,
  formatShortWeekday,
  parseDate,
  toDateKey,
} from '@/shared/lib/date';
import { formatHours, formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';

const monthFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
});

const dayMonthFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
});

const MONTH_NAMES = Array.from({ length: 12 }, (_, index) =>
  capitalize(monthFormatter.format(new Date(2000, index, 1))),
);

export function StatisticsScreen() {
  const currentWeek = React.useMemo(() => getStartOfWeek(new Date()), []);
  const currentMonth = React.useMemo(() => getMonthStart(new Date()), []);
  // Выбранные неделю, месяц и клиента храним здесь, чтобы они не сбрасывались
  // при переключении вкладок.
  const [selectedWeek, setSelectedWeek] = React.useState(currentWeek);
  const [selectedMonth, setSelectedMonth] = React.useState(currentMonth);
  const [selectedClient, setSelectedClient] = React.useState<WorkSessionClient | null>(null);

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
          <WeekStatistics
            week={selectedWeek}
            currentWeek={currentWeek}
            onWeekChange={setSelectedWeek}
          />
        </TabsContent>
        <TabsContent value="month">
          <MonthStatistics
            month={selectedMonth}
            currentMonth={currentMonth}
            selectedClient={selectedClient}
            onMonthChange={setSelectedMonth}
            onClientChange={setSelectedClient}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function WeekStatistics({
  week,
  currentWeek,
  onWeekChange,
}: {
  week: Date;
  currentWeek: Date;
  onWeekChange: (week: Date) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const workSessionsQuery = useWorkSessionsQuery({
    dateFrom: toDateKey(week),
    dateTo: toDateKey(addDays(week, 6)),
  });

  // Будущие недели не показываем: подтверждённых смен там ещё нет.
  const goToWeek = (next: Date) => {
    if (next <= currentWeek) {
      onWeekChange(next);
    }
  };

  return (
    <PeriodSwipeArea
      disabled={isPickerOpen}
      onSwipe={(direction) => goToWeek(addWeeks(week, direction))}
    >
      <PeriodNavigation
        label={formatWeekLabel(week, currentWeek)}
        previousLabel="Предыдущая неделя"
        nextLabel="Следующая неделя"
        isNextDisabled={week.getTime() === currentWeek.getTime()}
        onPrevious={() => goToWeek(addWeeks(week, -1))}
        onNext={() => goToWeek(addWeeks(week, 1))}
        onOpenPicker={() => setIsPickerOpen(true)}
      />

      <PeriodPickerDialog title="Выбери неделю" open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <WeekPicker
          week={week}
          currentWeek={currentWeek}
          onSelect={(next) => {
            goToWeek(next);
            setIsPickerOpen(false);
          }}
        />
      </PeriodPickerDialog>

      <PeriodStatistics
        sessions={workSessionsQuery.data ?? []}
        isLoading={workSessionsQuery.isPending}
        error={workSessionsQuery.error}
      />
    </PeriodSwipeArea>
  );
}

function MonthStatistics({
  month,
  currentMonth,
  selectedClient,
  onMonthChange,
  onClientChange,
}: {
  month: Date;
  currentMonth: Date;
  selectedClient: WorkSessionClient | null;
  onMonthChange: (month: Date) => void;
  onClientChange: (client: WorkSessionClient | null) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const clientFilterRef = React.useRef<HTMLDivElement>(null);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const workSessionsQuery = useWorkSessionsQuery({
    dateFrom: toDateKey(month),
    dateTo: toDateKey(monthEnd),
  });
  const sessions = workSessionsQuery.data ?? [];
  const confirmedSessions = sessions.filter((session) => session.status === 'confirmed');
  const clientOptions = getClientOptions(confirmedSessions, selectedClient);

  // Будущие месяцы не показываем: подтверждённых смен там ещё нет.
  const goToMonth = (next: Date) => {
    if (next <= currentMonth) {
      onMonthChange(next);
    }
  };

  return (
    <PeriodSwipeArea
      disabled={isPickerOpen}
      onSwipe={(direction) => goToMonth(addMonths(month, direction))}
    >
      <PeriodNavigation
        label={formatMonthLabel(month)}
        previousLabel="Предыдущий месяц"
        nextLabel="Следующий месяц"
        isNextDisabled={month.getTime() === currentMonth.getTime()}
        onPrevious={() => goToMonth(addMonths(month, -1))}
        onNext={() => goToMonth(addMonths(month, 1))}
        onOpenPicker={() => setIsPickerOpen(true)}
      />

      <PeriodPickerDialog title="Выбери месяц" open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <MonthPicker
          month={month}
          currentMonth={currentMonth}
          onSelect={(next) => {
            goToMonth(next);
            setIsPickerOpen(false);
          }}
        />
      </PeriodPickerDialog>

      <div ref={clientFilterRef} className="scroll-mt-4">
        <ClientFilter
          options={clientOptions}
          selectedClientId={selectedClient?.id ?? null}
          isLoading={workSessionsQuery.isPending}
          onSelect={onClientChange}
        />
      </div>

      {selectedClient ? (
        <ClientStatistics
          client={selectedClient}
          sessions={confirmedSessions.filter((session) => session.clientId === selectedClient.id)}
          isLoading={workSessionsQuery.isPending}
          error={workSessionsQuery.error}
        />
      ) : (
        <PeriodStatistics
          sessions={sessions}
          isLoading={workSessionsQuery.isPending}
          error={workSessionsQuery.error}
          onClientSelect={(client) => {
            onClientChange(client);
            // Нажали на клиента внизу разбивки — поднимаемся к переключателю, к началу его статистики.
            clientFilterRef.current?.scrollIntoView({
              block: 'nearest',
              behavior: getScrollBehavior(),
            });
          }}
        />
      )}
    </PeriodSwipeArea>
  );
}

/**
 * Переключатель «Все · Клиент 1 · Клиент 2». На телефоне — ряд с прокруткой вбок
 * во всю ширину экрана, на больших экранах — с переносом строк.
 */
function ClientFilter({
  options,
  selectedClientId,
  isLoading,
  onSelect,
}: {
  options: WorkSessionClient[];
  selectedClientId: string | null;
  isLoading: boolean;
  onSelect: (client: WorkSessionClient | null) => void;
}) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const optionsKey = options.map((option) => option.id).join();

  // Выбранный клиент мог оказаться за краем ряда — прокручиваем ряд, чтобы он был по центру.
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    const chip = scroller?.querySelector<HTMLElement>('[aria-pressed="true"]');

    if (!scroller || !chip || scroller.scrollWidth <= scroller.clientWidth) {
      return;
    }

    scroller.scrollTo({
      left: chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2,
      behavior: getScrollBehavior(),
    });
  }, [selectedClientId, optionsKey]);

  return (
    <div
      ref={scrollerRef}
      // Прокрутка ряда вбок не должна листать месяц.
      data-swipe-ignore
      className="relative -mx-4 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <div role="group" aria-label="Клиент" className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        <ClientFilterChip isSelected={selectedClientId === null} onClick={() => onSelect(null)}>
          Все
        </ClientFilterChip>
        {options.map((client) => (
          <ClientFilterChip
            key={client.id}
            isSelected={client.id === selectedClientId}
            onClick={() => onSelect(client)}
          >
            {client.name}
          </ClientFilterChip>
        ))}
        {isLoading &&
          options.length === 0 &&
          Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-24 shrink-0 rounded-full" />
          ))}
      </div>
    </div>
  );
}

function ClientFilterChip({
  isSelected,
  onClick,
  children,
}: {
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      className={cn(
        'h-11 max-w-[14rem] shrink-0 rounded-full px-4 text-base',
        isSelected && 'border border-primary',
      )}
      aria-pressed={isSelected}
      onClick={onClick}
    >
      <span className="truncate">{children}</span>
    </Button>
  );
}

/** Статистика одного клиента за месяц: итоги, сводка и смены по датам. */
function ClientStatistics({
  client,
  sessions,
  isLoading,
  error,
}: {
  client: WorkSessionClient;
  sessions: WorkSession[];
  isLoading: boolean;
  error: Error | null;
}) {
  const sortedSessions = [...sessions].sort(
    (first, second) =>
      first.workDate.localeCompare(second.workDate) ||
      first.startTime.localeCompare(second.startTime),
  );
  const totalHours = sum(sessions.map((session) => session.hours));
  const totalAmount = sum(sessions.map((session) => session.totalAmount));
  const salaryAmount = sum(sessions.map((session) => session.amount));
  const expensesAmount = sum(sessions.map((session) => session.expensesAmount));

  return (
    <div className="space-y-4" aria-busy={isLoading}>
      <LoadingStatus active={isLoading} label="Загружаем статистику…" />

      {error && <StatisticsError error={error} />}

      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <StatMetric
          icon={Clock3}
          title="Часы"
          value={formatHours(totalHours)}
          isLoading={isLoading}
        />
        <StatMetric
          icon={Banknote}
          title="Доход"
          value={formatMoney(totalAmount)}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        {/* На телефоне сводка над списком смен, на десктопе — справа от него. */}
        <section className="rounded-lg border border-border bg-card p-4 lg:col-start-2 lg:row-start-1">
          <h2 className="mb-4 text-lg font-semibold">Сводка</h2>
          <div className="space-y-3">
            <SummaryLine label="Смен" value={String(sessions.length)} isLoading={isLoading} />
            <SummaryLine
              label="Оплата за часы"
              value={formatMoney(salaryAmount)}
              isLoading={isLoading}
            />
            <SummaryLine
              label="Расходы"
              value={formatMoney(expensesAmount)}
              isLoading={isLoading}
            />
            <SummaryLine
              label="Средняя ставка"
              value={formatMoney(totalHours > 0 ? salaryAmount / totalHours : 0)}
              isLoading={isLoading}
            />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 lg:col-start-1 lg:row-start-1">
          <h2 className="mb-4 text-lg font-semibold">Смены</h2>

          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-3 rounded-md bg-muted px-3 py-2"
                >
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && sortedSessions.length === 0 && (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              {client.name}: за этот месяц подтверждённых смен нет.
            </p>
          )}

          {sortedSessions.length > 0 && (
            <ul className="space-y-2">
              {sortedSessions.map((session) => {
                const date = parseDate(session.workDate);

                return (
                  <li
                    key={session.id}
                    className="flex items-start justify-between gap-3 rounded-md bg-muted px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {formatDay(date)}, {formatShortWeekday(date)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.startTime}–{session.endTime} · {formatHours(session.hours)}
                      </p>
                      {session.expenses.length > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Расходы: {formatExpenses(session.expenses)}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 font-semibold">{formatMoney(session.totalAmount)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Свайп влево-вправо листает период, как недели в расписании. direction: 1 — вперёд, -1 — назад. */
function PeriodSwipeArea({
  disabled,
  onSwipe,
  children,
}: {
  disabled: boolean;
  onSwipe: (direction: 1 | -1) => void;
  children: React.ReactNode;
}) {
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className="space-y-4"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        // Внутри есть свои горизонтальные прокрутки (ряд клиентов) — там свайп не листает период.
        const isIgnored =
          event.target instanceof Element && event.target.closest('[data-swipe-ignore]');
        touchStart.current = touch && !isIgnored ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const touch = event.changedTouches[0];
        touchStart.current = null;

        // Касания внутри шторки тоже долетают сюда через портал — там свайп не нужен.
        if (!start || !touch || disabled) {
          return;
        }

        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;

        if (Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY)) {
          onSwipe(deltaX < 0 ? 1 : -1);
        }
      }}
    >
      {children}
    </div>
  );
}

function PeriodNavigation({
  label,
  previousLabel,
  nextLabel,
  isNextDisabled,
  onPrevious,
  onNext,
  onOpenPicker,
}: {
  label: string;
  previousLabel: string;
  nextLabel: string;
  isNextDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onOpenPicker: () => void;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:max-w-md">
      <Button
        variant="outline"
        size="icon"
        className="size-12 [&_svg]:size-5"
        aria-label={previousLabel}
        onClick={onPrevious}
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="outline"
        className="h-12 min-w-0 text-base font-semibold"
        aria-haspopup="dialog"
        onClick={onOpenPicker}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="text-muted-foreground" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="size-12 [&_svg]:size-5"
        aria-label={nextLabel}
        disabled={isNextDisabled}
        onClick={onNext}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

function PeriodPickerDialog({
  title,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* Содержимое монтируется при каждом открытии — выбор стартует с текущего периода. */}
        {children}
      </DialogContent>
    </Dialog>
  );
}

function WeekPicker({
  week,
  currentWeek,
  onSelect,
}: {
  week: Date;
  currentWeek: Date;
  onSelect: (week: Date) => void;
}) {
  // Неделя на стыке месяцев относится к месяцу своего четверга — как в ISO-календаре.
  const [month, setMonth] = React.useState(() => getMonthStart(addDays(week, 3)));
  const currentMonth = getMonthStart(addDays(currentWeek, 3));
  const currentYear = currentMonth.getFullYear();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-12 [&_svg]:size-5"
          aria-label="Предыдущий месяц"
          onClick={() => setMonth((current) => addMonths(current, -1))}
        >
          <ChevronLeft />
        </Button>
        <p className="text-center text-lg font-semibold">
          {month.getFullYear() === currentYear
            ? MONTH_NAMES[month.getMonth()]
            : formatMonthLabel(month)}
        </p>
        <Button
          variant="outline"
          size="icon"
          className="size-12 [&_svg]:size-5"
          aria-label="Следующий месяц"
          disabled={month >= currentMonth}
          onClick={() => setMonth((current) => addMonths(current, 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="grid gap-2">
        {getMonthWeeks(month).map((option) => {
          const isSelected = option.getTime() === week.getTime();
          const isCurrent = option.getTime() === currentWeek.getTime();

          return (
            <Button
              key={option.getTime()}
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'h-12 justify-between px-4 text-base',
                isSelected && 'border border-primary',
                isCurrent && !isSelected && 'border-primary/50 text-primary',
              )}
              disabled={option > currentWeek}
              aria-current={isSelected ? 'date' : undefined}
              onClick={() => onSelect(option)}
            >
              <span className="truncate">{formatWeekRange(option)}</span>
              {isCurrent && <span className="text-sm font-normal opacity-80">текущая</span>}
            </Button>
          );
        })}
      </div>

      <Button
        variant="outline"
        className="h-12 w-full text-base"
        disabled={week.getTime() === currentWeek.getTime()}
        onClick={() => onSelect(currentWeek)}
      >
        Текущая неделя
      </Button>
    </div>
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
  onClientSelect,
}: {
  sessions: WorkSession[];
  isLoading: boolean;
  error: Error | null;
  /** Если задан — строки разбивки нажимаются и открывают статистику клиента. */
  onClientSelect?: (client: WorkSessionClient) => void;
}) {
  const confirmedSessions = sessions.filter((session) => session.status === 'confirmed');
  const totalHours = sum(confirmedSessions.map((session) => session.hours));
  const totalAmount = sum(confirmedSessions.map((session) => session.totalAmount));

  return (
    <div className="space-y-4" aria-busy={isLoading}>
      <LoadingStatus active={isLoading} label="Загружаем статистику…" />

      {error && <StatisticsError error={error} />}

      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <StatMetric
          icon={Clock3}
          title="Часы"
          value={formatHours(totalHours)}
          isLoading={isLoading}
        />
        <StatMetric
          icon={Banknote}
          title="Доход"
          value={formatMoney(totalAmount)}
          isLoading={isLoading}
        />
      </div>

      <Breakdown
        sessions={confirmedSessions}
        isLoading={isLoading}
        onClientSelect={onClientSelect}
      />
    </div>
  );
}

function StatisticsError({ error }: { error: Error }) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <p>{getApiErrorMessage(error)}</p>
    </div>
  );
}

function StatMetric({
  icon: Icon,
  title,
  value,
  isLoading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        {isLoading ? (
          <Skeleton className="mt-1 h-7 w-24" />
        ) : (
          <p className="mt-1 text-lg font-semibold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Breakdown({
  sessions,
  isLoading,
  onClientSelect,
}: {
  sessions: WorkSession[];
  isLoading: boolean;
  onClientSelect?: (client: WorkSessionClient) => void;
}) {
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
          {isLoading ? (
            <Skeleton className="h-[22px] w-20" />
          ) : (
            <Badge variant="secondary">{formatMoney(totalAmount)}</Badge>
          )}
        </div>

        <div className="space-y-4">
          {isLoading &&
            Array.from({ length: 3 }, (_, index) => (
              <div key={index}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}

          {!isLoading && rows.length === 0 && (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              За выбранный период нет подтверждённых смен.
            </p>
          )}

          {rows.map((row) => {
            const content = (
              <>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.client.name}</p>
                    <p className="text-sm text-muted-foreground">{formatHours(row.hours)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <p className="font-semibold">{formatMoney(row.amount)}</p>
                    {onClientSelect && <ChevronRight className="size-4 text-muted-foreground" />}
                  </div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.max(8, (row.amount / Math.max(totalAmount, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </>
            );

            return onClientSelect ? (
              <button
                key={row.client.id}
                type="button"
                className="-mx-2 block w-[calc(100%+1rem)] rounded-md px-2 py-1.5 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 active:bg-accent"
                onClick={() => onClientSelect(row.client)}
              >
                {content}
              </button>
            ) : (
              <div key={row.client.id}>{content}</div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 text-lg font-semibold">Сводка</h2>
        <div className="space-y-3">
          <SummaryLine
            label="Подтверждённые часы"
            value={formatHours(totalHours)}
            isLoading={isLoading}
          />
          <SummaryLine label="Начислено" value={formatMoney(totalAmount)} isLoading={isLoading} />
          <SummaryLine
            label="Средняя ставка"
            value={formatMoney(totalHours > 0 ? totalSalaryAmount / totalHours : 0)}
            isLoading={isLoading}
          />
        </div>
      </section>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: string;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {isLoading ? (
        <Skeleton className="h-5 w-16" />
      ) : (
        <span className="font-semibold">{value}</span>
      )}
    </div>
  );
}

/**
 * Клиенты для переключателя — из смен месяца, а не из списка клиентов: в прошлых
 * месяцах могут быть клиенты, которых в списке уже нет. Выбранный клиент остаётся
 * в ряду, даже если в этом месяце смен у него нет, — чтобы листать месяцы по одному клиенту.
 */
function getClientOptions(sessions: WorkSession[], selectedClient: WorkSessionClient | null) {
  const clients = new Map(sessions.map((session) => [session.clientId, session.client]));

  if (selectedClient && !clients.has(selectedClient.id)) {
    clients.set(selectedClient.id, selectedClient);
  }

  return Array.from(clients.values()).sort((first, second) =>
    first.name.localeCompare(second.name, 'ru'),
  );
}

function getScrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
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

/** Недели (понедельники), которые хотя бы одним днём попадают в месяц. */
function getMonthWeeks(month: Date) {
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const weeks: Date[] = [];

  for (let week = getStartOfWeek(month); week <= monthEnd; week = addWeeks(week, 1)) {
    weeks.push(week);
  }

  return weeks;
}

/** «6–12 октября» или «29 сентября – 5 октября». */
function formatWeekRange(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${weekStart.getDate()}–${dayMonthFormatter.format(weekEnd)}`;
  }

  return `${dayMonthFormatter.format(weekStart)} – ${dayMonthFormatter.format(weekEnd)}`;
}

/** Год дописываем только для недель не текущего года. Год недели — по её четвергу. */
function formatWeekLabel(weekStart: Date, currentWeek: Date) {
  const year = addDays(weekStart, 3).getFullYear();
  const range = formatWeekRange(weekStart);

  return year === addDays(currentWeek, 3).getFullYear() ? range : `${range} ${year}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
