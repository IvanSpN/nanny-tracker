'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  MessageSquareText,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Controller, useFieldArray, useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingStatus } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useClientsQuery } from '@/entities/client/api/client.queries';
import type { WorkerClient } from '@/entities/client/model/types';
import {
  useCreateWorkSessionMutation,
  useCreateWorkSessionsMutation,
  useDeleteWorkSessionMutation,
  useUpdateWorkSessionMutation,
  useUpdateWorkSessionStatusMutation,
} from '@/entities/work-session/api/work-session.mutations';
import { useWorkSessionsQuery } from '@/entities/work-session/api/work-session.queries';
import { formatExpenses } from '@/entities/work-session/lib/format-expenses';
import type {
  WorkSession,
  WorkSessionRateType,
  WorkSessionStatus,
} from '@/entities/work-session/model/types';
import { getApiErrorMessage } from '@/shared/api/http-client';
import {
  addDays,
  addWeeks,
  formatDay,
  formatDayRange,
  formatFullWeekday,
  formatShortWeekday,
  getWeekDays,
  getWeekdayLabel,
  isWeekend,
  parseDate,
  toDateKey,
} from '@/shared/lib/date';
import { formatHours, formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';

const WORK_SESSION_COMMENT_MAX_LENGTH = 240;
const WORK_SESSION_EXPENSE_DESCRIPTION_MAX_LENGTH = 120;
const WORK_SESSION_EXPENSES_MAX_COUNT = 20;

const workSessionFormSchema = z.object({
  clientId: z.string().min(1, 'Выберите клиента'),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату'),
  hours: z.coerce.number().min(0.25, 'Минимум 15 минут').max(24, 'Максимум 24 часа'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Укажите время начала'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Укажите время окончания'),
  dayType: z.enum(['normal', 'holiday']),
  comment: z
    .string()
    .max(WORK_SESSION_COMMENT_MAX_LENGTH, 'Комментарий до 240 символов')
    .optional(),
});

const workSessionCommentSchema = z.object({
  comment: z.string().max(WORK_SESSION_COMMENT_MAX_LENGTH, 'Комментарий до 240 символов'),
});

const workSessionExpensesSchema = z.object({
  expenses: z
    .array(
      z.object({
        amount: z.coerce.number().positive('Укажите сумму'),
        description: z
          .string()
          .trim()
          .min(1, 'Укажите, за что')
          .max(WORK_SESSION_EXPENSE_DESCRIPTION_MAX_LENGTH, 'До 120 символов'),
      }),
    )
    .max(WORK_SESSION_EXPENSES_MAX_COUNT),
});

type WorkSessionFormInput = z.input<typeof workSessionFormSchema>;
type WorkSessionFormValues = z.output<typeof workSessionFormSchema>;
type WorkSessionCommentValues = z.infer<typeof workSessionCommentSchema>;
type WorkSessionExpensesInput = z.input<typeof workSessionExpensesSchema>;
type WorkSessionExpensesValues = z.output<typeof workSessionExpensesSchema>;
type ClientSummary = {
  id: string;
  name: string;
};

export function WorkerScheduleScreen() {
  const clientsQuery = useClientsQuery();
  const clients = Array.isArray(clientsQuery.data) ? clientsQuery.data : [];
  const activeClients = clients.filter((client) => client.isActive);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [noClientsMessage, setNoClientsMessage] = React.useState<string | null>(null);
  const [addSessionDate, setAddSessionDate] = React.useState<string | null>(null);
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);
  const baseWeekStart = React.useMemo(() => getStartOfWeek(new Date()), []);
  const todayKey = React.useMemo(() => toDateKey(new Date()), []);
  const weekStart = addWeeks(baseWeekStart, weekOffset);
  const weekDays = getWeekDays(weekStart);
  const dateFrom = toDateKey(weekDays[0]);
  const dateTo = toDateKey(weekDays[6]);
  const workSessionsQuery = useWorkSessionsQuery({ dateFrom, dateTo });
  const updateStatusMutation = useUpdateWorkSessionStatusMutation();
  const deleteWorkSessionMutation = useDeleteWorkSessionMutation();
  const copyWeekMutation = useCreateWorkSessionsMutation();
  const weekKeys = new Set(weekDays.map(toDateKey));
  const workSessions = Array.isArray(workSessionsQuery.data) ? workSessionsQuery.data : [];
  const weekSessions = workSessions.filter((session) => weekKeys.has(session.workDate));
  const confirmedSessions = weekSessions.filter((session) => session.status === 'confirmed');
  const plannedSessions = weekSessions.filter((session) => session.status === 'pending');
  const weekTotalHours = sum(confirmedSessions.map((session) => session.hours));
  const weekTotalMoney = sum(confirmedSessions.map((session) => session.totalAmount));
  // Прогноз недели: уже отработанное плюс планируемый доход всех дней.
  const weekExpectedMoney =
    weekTotalMoney + sum(plannedSessions.map((session) => session.totalAmount));
  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const groupedByClient = groupByClient(confirmedSessions, clients);
  // Смены несут имя клиента сами, поэтому неделю рисуем, не дожидаясь списка клиентов.
  // isPending, а не isLoading: без сети запрос на паузе, и isLoading показал бы «Свободный день».
  const isScheduleLoading = workSessionsQuery.isPending;
  const isAddSessionDisabled = clientsQuery.isPending;
  const mutationError =
    updateStatusMutation.error ?? deleteWorkSessionMutation.error ?? copyWeekMutation.error;

  const openAddSessionDialog = (dateKey: string) => {
    if (activeClients.length === 0) {
      setNoClientsMessage('Сначала добавь активного клиента, потом можно будет создать смену.');
      return;
    }

    setNoClientsMessage(null);
    setAddSessionDate(dateKey);
  };

  const toggleSessionStatus = (session: WorkSession) => {
    updateStatusMutation.mutate({
      id: session.id,
      payload: {
        status: session.status === 'confirmed' ? 'pending' : 'confirmed',
      },
    });
  };

  const copyWeekToNext = () => {
    copyWeekMutation.mutate(
      weekSessions.map((session) => ({
        clientId: session.clientId,
        workDate: toDateKey(addDays(parseDate(session.workDate), 7)),
        startTime: session.startTime,
        endTime: session.endTime,
        rateType: isManualHoliday(session) ? 'weekend' : undefined,
        comment: session.comment,
      })),
      {
        onSuccess: () => setWeekOffset((current) => current + 1),
      },
    );
  };

  return (
    <section
      className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6"
      aria-busy={isScheduleLoading}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const touch = event.changedTouches[0];
        touchStart.current = null;

        if (!start || !touch) {
          return;
        }

        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;

        if (Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY)) {
          setWeekOffset((current) => current + (deltaX < 0 ? 1 : -1));
        }
      }}
    >
      <div className="mb-4">
        <p className="text-sm font-medium text-muted-foreground">Расписание</p>
        <h1 className="text-2xl font-semibold tracking-normal">
          {formatDayRange(weekDays[0], weekDays[6])}
        </h1>
      </div>

      <LoadingStatus active={isScheduleLoading} label="Загружаем смены…" />

      <AddWorkSessionDialog
        open={addSessionDate !== null}
        clients={activeClients}
        defaultDate={addSessionDate ?? dateFrom}
        onOpenChange={(open) => {
          if (!open) {
            setAddSessionDate(null);
          }
        }}
      />

      {(clientsQuery.isError || workSessionsQuery.isError || mutationError || noClientsMessage) && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {clientsQuery.isError && <p>{getApiErrorMessage(clientsQuery.error)}</p>}
          {workSessionsQuery.isError && <p>{getApiErrorMessage(workSessionsQuery.error)}</p>}
          {mutationError && <p>{getApiErrorMessage(mutationError)}</p>}
          {noClientsMessage && <p>{noClientsMessage}</p>}
        </div>
      )}

      <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((current) => current - 1)}
        >
          <ChevronLeft />
        </Button>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const dateKey = toDateKey(day);
            const isToday = dateKey === todayKey;

            return (
              <button
                type="button"
                key={dateKey}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center rounded-md border text-center transition-colors outline-none hover:-translate-y-0.5 hover:shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
                  getWeekStripDayTone(day, isToday),
                  isToday && 'ring-1 ring-primary/35',
                )}
                title="Добавить смену в этот день"
                disabled={isAddSessionDisabled}
                onClick={() => openAddSessionDialog(dateKey)}
              >
                <span
                  className={cn(
                    'text-[11px] font-medium uppercase',
                    isWeekend(day) ? 'text-current' : 'text-muted-foreground',
                  )}
                >
                  {formatShortWeekday(day)}
                </span>
                <span className="text-sm font-semibold">{day.getDate()}</span>
              </button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((current) => current + 1)}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Metric
          title="Часы"
          value={formatHours(weekTotalHours)}
          icon={Clock3}
          isLoading={isScheduleLoading}
        />
        <Metric
          title="Доход"
          value={formatMoney(weekTotalMoney)}
          icon={Sparkles}
          isLoading={isScheduleLoading}
          footnote={
            <>
              Планируемый:{' '}
              <span className="font-semibold whitespace-nowrap text-foreground/80">
                ≈&nbsp;{formatMoney(weekExpectedMoney)}
              </span>
            </>
          }
        />
      </div>

      <div className="mb-5 flex gap-2">
        <Button
          variant="soft"
          className="flex-1"
          disabled={weekSessions.length === 0}
          loading={copyWeekMutation.isPending}
          onClick={copyWeekToNext}
        >
          <Copy />
          {copyWeekMutation.isPending ? 'Копируем...' : 'Копировать неделю'}
        </Button>
        <Button variant="outline" onClick={() => setWeekOffset(0)}>
          Сегодня
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-3">
          {weekDays.map((day, index) => {
            const dateKey = toDateKey(day);
            const isToday = dateKey === todayKey;
            const daySessions = weekSessions.filter((session) => session.workDate === dateKey);
            const confirmedDaySessions = daySessions.filter(
              (session) => session.status === 'confirmed',
            );
            const confirmedDayHours = sum(confirmedDaySessions.map((session) => session.hours));
            const confirmedDayMoney = sum(
              confirmedDaySessions.map((session) => session.totalAmount),
            );
            const plannedDaySessions = daySessions.filter(
              (session) => session.status === 'pending',
            );
            const plannedDayMoney = sum(plannedDaySessions.map((session) => session.totalAmount));

            return (
              <section
                key={dateKey}
                className={cn(
                  'schedule-day-section rounded-lg border p-3 transition-colors',
                  getScheduleListDayTone(day, index),
                  isToday && 'ring-1 ring-primary/35',
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold capitalize">
                        {formatFullWeekday(day)}
                      </h2>
                      {isToday && <Badge variant="default">Сегодня</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDay(day)}</p>
                  </div>
                  {isScheduleLoading ? (
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-[22px] w-10" />
                      <Skeleton className="h-[22px] w-16" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <Badge variant={confirmedDayHours > 0 ? 'success' : 'muted'}>
                          {formatHours(confirmedDayHours)}
                        </Badge>
                        <Badge variant={confirmedDayMoney > 0 ? 'success' : 'muted'}>
                          {formatMoney(confirmedDayMoney)}
                        </Badge>
                      </div>
                      {plannedDaySessions.length > 0 && (
                        <p
                          className="cursor-help text-xs leading-tight font-light text-muted-foreground"
                          title="Планируемый доход: смены этого дня, которые ещё не подтверждены"
                          aria-label={`Планируемый доход ${formatMoney(plannedDayMoney)}`}
                        >
                          ≈&nbsp;{formatMoney(plannedDayMoney)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {isScheduleLoading && <WorkSessionRowSkeleton />}

                  {!isScheduleLoading && daySessions.length === 0 && (
                    <div className="rounded-md border border-dashed border-border px-3 py-4 text-center">
                      <p className="text-sm text-muted-foreground">Свободный день</p>
                    </div>
                  )}

                  {daySessions.map((session) => {
                    const client = clientMap.get(session.clientId);

                    return (
                      <WorkSessionRow
                        key={session.id}
                        session={session}
                        client={client}
                        clients={activeClients}
                        isStatusPending={updateStatusMutation.isPending}
                        isStatusUpdating={
                          updateStatusMutation.isPending &&
                          updateStatusMutation.variables?.id === session.id
                        }
                        isDeletePending={deleteWorkSessionMutation.isPending}
                        isDeleting={
                          deleteWorkSessionMutation.isPending &&
                          deleteWorkSessionMutation.variables === session.id
                        }
                        onToggle={() => toggleSessionStatus(session)}
                        onDelete={() => deleteWorkSessionMutation.mutate(session.id)}
                      />
                    );
                  })}

                  {!isScheduleLoading && (
                    <div className="flex justify-center pt-1">
                      <Button
                        size="icon"
                        variant="soft"
                        className="size-8 rounded-full border border-primary/20 bg-background/70 shadow-xs"
                        title="Добавить смену в этот день"
                        aria-label="Добавить смену в этот день"
                        disabled={isAddSessionDisabled}
                        onClick={() => openAddSessionDialog(dateKey)}
                      >
                        <Plus />
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="space-y-3">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">По клиентам</h2>
            <div className="space-y-3">
              {isScheduleLoading &&
                Array.from({ length: 2 }, (_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              {!isScheduleLoading && groupedByClient.length === 0 && (
                <p className="text-sm text-muted-foreground">Пока нет подтверждённых смен.</p>
              )}
              {groupedByClient.map((item) => (
                <div key={item.client.id}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{item.client.name}</span>
                    <span className="text-muted-foreground">{formatHours(item.hours)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${Math.max(8, (item.hours / Math.max(weekTotalHours, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-sm font-semibold">{formatMoney(item.amount)}</p>
                </div>
              ))}
            </div>
          </section>

          {clientsQuery.isSuccess && activeClients.length === 0 && (
            <section className="rounded-lg border border-dashed border-border bg-card p-4">
              <h2 className="text-base font-semibold">Нет клиентов</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Сначала добавь клиента на странице клиентов, потом здесь можно будет создавать
                смены.
              </p>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  isLoading,
  footnote,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  isLoading: boolean;
  footnote?: React.ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="min-w-0 p-3">
        <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        {isLoading ? (
          <Skeleton className="my-0.5 h-5 w-20 sm:h-6" />
        ) : (
          <p className="min-w-0 break-words text-base leading-tight font-semibold sm:text-lg">
            {value}
          </p>
        )}
        {footnote &&
          (isLoading ? (
            <Skeleton className="mt-1.5 h-3.5 w-28" />
          ) : (
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{footnote}</p>
          ))}
      </CardContent>
    </Card>
  );
}

function WorkSessionRow({
  session,
  client,
  clients,
  isStatusPending,
  isStatusUpdating,
  isDeletePending,
  isDeleting,
  onToggle,
  onDelete,
}: {
  session: WorkSession;
  client?: WorkerClient;
  clients: WorkerClient[];
  isStatusPending: boolean;
  /** Статус меняется именно у этой смены. */
  isStatusUpdating: boolean;
  isDeletePending: boolean;
  /** Удаляется именно эта смена. */
  isDeleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isConfirmed = session.status === 'confirmed';
  const clientName = client?.name ?? session.client.name;
  const rateBadge = getRateBadge(session);
  const statusBadge = getStatusBadge(session.status);

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto] gap-3 rounded-md border p-3 transition-[background-color,border-color,opacity]',
        isConfirmed ? 'border-success/25 bg-success/5' : 'border-border bg-background',
        isDeleting && 'pointer-events-none opacity-50',
      )}
      aria-busy={isDeleting || undefined}
      onDoubleClick={onToggle}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 text-xl leading-tight font-bold break-words">{clientName}</p>
          {rateBadge && <Badge variant={rateBadge.variant}>{rateBadge.label}</Badge>}
          {statusBadge && <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          с {session.startTime} до {session.endTime} · {formatHours(session.hours)}
        </p>
        {session.expenses.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Расходы: {formatExpenses(session.expenses)}
          </p>
        )}
        {session.comment && (
          <p className="mt-2 line-clamp-3 rounded-md bg-muted/70 px-2 py-1.5 text-xs text-muted-foreground">
            {session.comment}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end justify-between gap-2">
        <p className="text-sm font-semibold">{formatMoney(session.totalAmount)}</p>
        <div className="flex items-center gap-1">
          <WorkSessionExpensesDialog session={session} />
          <WorkSessionCommentDialog session={session} />
          <EditWorkSessionDialog session={session} clients={clients} />
          <DeleteWorkSessionDialog
            session={session}
            clientName={clientName}
            isPending={isDeletePending}
            onDelete={onDelete}
          />
        </div>
        <Button
          size="sm"
          variant={isConfirmed ? 'soft' : 'outline'}
          disabled={isStatusPending}
          loading={isStatusUpdating}
          onClick={onToggle}
        >
          {isConfirmed ? 'Отработано' : 'Подтвердить'}
        </Button>
      </div>
    </div>
  );
}

/** Заглушка смены на время загрузки: те же отступы и строки, что у WorkSessionRow. */
function WorkSessionRowSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-border bg-background/60 p-3">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-7 w-36 max-w-full" />
        <Skeleton className="h-4 w-32 max-w-full" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

function WorkSessionExpensesDialog({ session }: { session: WorkSession }) {
  const [open, setOpen] = React.useState(false);
  const updateWorkSessionMutation = useUpdateWorkSessionMutation();
  const getDefaults = React.useCallback(
    (): WorkSessionExpensesInput => ({
      expenses:
        session.expenses.length > 0
          ? session.expenses.map((expense) => ({
              amount: expense.amount,
              description: expense.description,
            }))
          : [{ amount: '', description: '' }],
    }),
    [session.expenses],
  );
  const form = useForm<WorkSessionExpensesInput, unknown, WorkSessionExpensesValues>({
    resolver: zodResolver(workSessionExpensesSchema),
    defaultValues: getDefaults(),
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'expenses',
  });
  const expenses = useWatch({ control: form.control, name: 'expenses' }) ?? [];
  const expensesTotal = sum(
    expenses.map((expense) => {
      const amount = Number(expense.amount);

      return Number.isFinite(amount) && amount > 0 ? amount : 0;
    }),
  );
  const errors = form.formState.errors.expenses;
  const isPending = updateWorkSessionMutation.isPending;

  React.useEffect(() => {
    if (open) {
      form.reset(getDefaults());
    }
  }, [form, getDefaults, open]);

  const save = async (values: WorkSessionExpensesValues) => {
    try {
      await updateWorkSessionMutation.mutateAsync({
        id: session.id,
        payload: {
          expenses: values.expenses.map((expense) => ({
            amount: expense.amount.toFixed(2),
            description: expense.description,
          })),
        },
      });

      setOpen(false);
    } catch {
      // Error is rendered from mutation state.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          updateWorkSessionMutation.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant={session.expenses.length > 0 ? 'soft' : 'ghost'}
          title={session.expenses.length > 0 ? 'Изменить доп. расходы' : 'Добавить доп. расходы'}
        >
          <Wallet />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Доп. расходы</DialogTitle>
          <DialogDescription>
            Траты за свой счёт: вода, развивашки, площадка. Прибавятся к сумме смены.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(save)}>
          <div className="space-y-2">
            {fields.length === 0 && (
              <p className="rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
                Расходов нет
              </p>
            )}
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-1">
                <div className="grid grid-cols-[6.5rem_1fr_auto] gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Сумма"
                    aria-label="Сумма"
                    {...form.register(`expenses.${index}.amount`)}
                  />
                  <Input
                    placeholder="За что"
                    aria-label="За что"
                    maxLength={WORK_SESSION_EXPENSE_DESCRIPTION_MAX_LENGTH}
                    {...form.register(`expenses.${index}.description`)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="Удалить трату"
                    onClick={() => remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {(errors?.[index]?.amount || errors?.[index]?.description) && (
                  <p className="text-xs text-destructive">
                    {errors[index]?.amount?.message ?? errors[index]?.description?.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={fields.length >= WORK_SESSION_EXPENSES_MAX_COUNT}
              onClick={() => append({ amount: '', description: '' })}
            >
              <Plus />
              Добавить трату
            </Button>
            <p className="text-sm">
              Итого: <span className="font-semibold">{formatMoney(expensesTotal)}</span>
            </p>
          </div>

          {updateWorkSessionMutation.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {getApiErrorMessage(updateWorkSessionMutation.error)}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" loading={isPending}>
              {isPending ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkSessionCommentDialog({ session }: { session: WorkSession }) {
  const [open, setOpen] = React.useState(false);
  const updateWorkSessionMutation = useUpdateWorkSessionMutation();
  const form = useForm<WorkSessionCommentValues>({
    resolver: zodResolver(workSessionCommentSchema),
    defaultValues: {
      comment: session.comment ?? '',
    },
  });
  const comment =
    useWatch({
      control: form.control,
      name: 'comment',
    }) ?? '';
  const isPending = updateWorkSessionMutation.isPending;
  // comment: null — это удаление (кнопкой «Удалить» или сохранением пустого поля).
  const isDeleting = isPending && updateWorkSessionMutation.variables?.payload.comment === null;
  const isSaving = isPending && !isDeleting;

  React.useEffect(() => {
    if (open) {
      form.reset({
        comment: session.comment ?? '',
      });
    }
  }, [form, open, session.comment]);

  const saveComment = async (values: WorkSessionCommentValues) => {
    try {
      await updateWorkSessionMutation.mutateAsync({
        id: session.id,
        payload: {
          comment: values.comment.trim() || null,
        },
      });

      setOpen(false);
    } catch {
      // Error is rendered from mutation state.
    }
  };

  const deleteComment = async () => {
    try {
      await updateWorkSessionMutation.mutateAsync({
        id: session.id,
        payload: {
          comment: null,
        },
      });

      form.reset({
        comment: '',
      });
      setOpen(false);
    } catch {
      // Error is rendered from mutation state.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          updateWorkSessionMutation.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant={session.comment ? 'soft' : 'ghost'}
          title={session.comment ? 'Изменить комментарий' : 'Добавить комментарий'}
        >
          <MessageSquareText />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Комментарий к смене</DialogTitle>
          <DialogDescription>
            {formatDay(parseDate(session.workDate))}, {formatHours(session.hours)}.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(saveComment)}>
          <div className="space-y-2">
            <Label htmlFor={`session-comment-${session.id}`}>Комментарий</Label>
            <Textarea
              id={`session-comment-${session.id}`}
              className="min-h-28 resize-none"
              maxLength={WORK_SESSION_COMMENT_MAX_LENGTH}
              placeholder="Например: дневной сон, прогулка, важные детали"
              {...form.register('comment')}
            />
            <div className="flex items-center justify-between gap-3">
              {form.formState.errors.comment ? (
                <p className="text-xs text-destructive">{form.formState.errors.comment.message}</p>
              ) : (
                <span className="text-xs text-muted-foreground">Небольшая заметка для смены</span>
              )}
              <span className="text-xs text-muted-foreground">
                {comment.length}/{WORK_SESSION_COMMENT_MAX_LENGTH}
              </span>
            </div>
          </div>

          {updateWorkSessionMutation.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {getApiErrorMessage(updateWorkSessionMutation.error)}
            </p>
          )}

          <DialogFooter>
            {session.comment && (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                loading={isDeleting}
                onClick={() => void deleteComment()}
              >
                <Trash2 />
                {isDeleting ? 'Удаляем...' : 'Удалить'}
              </Button>
            )}
            <Button type="submit" disabled={isPending} loading={isSaving}>
              {isSaving ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteWorkSessionDialog({
  session,
  clientName,
  isPending,
  onDelete,
}: {
  session: WorkSession;
  clientName: string;
  isPending: boolean;
  onDelete: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  const deleteSession = () => {
    onDelete();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Удалить" disabled={isPending}>
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Удалить смену?</DialogTitle>
          <DialogDescription>
            {clientName}, {formatDay(parseDate(session.workDate))}, {formatHours(session.hours)}.
            Это действие нельзя отменить.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            Отмена
          </Button>
          <Button type="button" variant="destructive" disabled={isPending} onClick={deleteSession}>
            {isPending ? 'Удаляем...' : 'Удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddWorkSessionDialog({
  open,
  clients,
  defaultDate,
  onOpenChange,
}: {
  open: boolean;
  clients: WorkerClient[];
  defaultDate: string;
  onOpenChange: (open: boolean) => void;
}) {
  const createWorkSessionMutation = useCreateWorkSessionMutation();
  const form = useForm<WorkSessionFormInput, unknown, WorkSessionFormValues>({
    resolver: zodResolver(workSessionFormSchema),
    defaultValues: {
      clientId: clients[0]?.id ?? '',
      workDate: defaultDate,
      hours: 4,
      startTime: '10:00',
      endTime: '14:00',
      dayType: 'normal',
      comment: '',
    },
  });

  React.useEffect(() => {
    form.setValue('workDate', defaultDate);
  }, [defaultDate, form]);

  React.useEffect(() => {
    if (!form.getValues('clientId') && clients[0]) {
      form.setValue('clientId', clients[0].id);
    }
  }, [clients, form]);

  const submit = async (values: WorkSessionFormValues) => {
    try {
      await createWorkSessionMutation.mutateAsync({
        clientId: values.clientId,
        workDate: values.workDate,
        startTime: values.startTime,
        endTime: values.endTime,
        rateType: toRateType(values.dayType),
        comment: values.comment?.trim() || null,
      });

      onOpenChange(false);
      form.reset({
        clientId: values.clientId,
        workDate: values.workDate,
        hours: 4,
        startTime: '10:00',
        endTime: '14:00',
        dayType: 'normal',
        comment: '',
      });
    } catch {
      // Error is rendered from mutation state.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          createWorkSessionMutation.reset();
        }
      }}
    >
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Новая смена</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <WorkSessionFormFields form={form} clients={clients} />

          {createWorkSessionMutation.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {getApiErrorMessage(createWorkSessionMutation.error)}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" loading={createWorkSessionMutation.isPending}>
              {createWorkSessionMutation.isPending ? 'Добавляем...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditWorkSessionDialog({
  session,
  clients,
}: {
  session: WorkSession;
  clients: WorkerClient[];
}) {
  const [open, setOpen] = React.useState(false);
  const updateWorkSessionMutation = useUpdateWorkSessionMutation();
  const form = useForm<WorkSessionFormInput, unknown, WorkSessionFormValues>({
    resolver: zodResolver(workSessionFormSchema),
    defaultValues: getSessionFormDefaults(session),
  });

  React.useEffect(() => {
    if (open) {
      form.reset(getSessionFormDefaults(session));
    }
  }, [form, open, session]);

  const submit = async (values: WorkSessionFormValues) => {
    try {
      await updateWorkSessionMutation.mutateAsync({
        id: session.id,
        payload: {
          clientId: values.clientId,
          workDate: values.workDate,
          startTime: values.startTime,
          endTime: values.endTime,
          rateType: toRateType(values.dayType),
          comment: values.comment?.trim() || null,
        },
      });

      setOpen(false);
    } catch {
      // Error is rendered from mutation state.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          updateWorkSessionMutation.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Изменить">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изменить смену</DialogTitle>
          <DialogDescription>Сумма будет пересчитана после сохранения.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <WorkSessionFormFields form={form} clients={clients} />

          {updateWorkSessionMutation.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {getApiErrorMessage(updateWorkSessionMutation.error)}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" loading={updateWorkSessionMutation.isPending}>
              {updateWorkSessionMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkSessionFormFields({
  form,
  clients,
}: {
  form: UseFormReturn<WorkSessionFormInput, unknown, WorkSessionFormValues>;
  clients: WorkerClient[];
}) {
  const comment =
    useWatch({
      control: form.control,
      name: 'comment',
    }) ?? '';
  const clientId = useWatch({ control: form.control, name: 'clientId' });
  const workDate = useWatch({ control: form.control, name: 'workDate' });
  const selectedClient = clients.find((client) => client.id === clientId);
  const workDateWeekday = /^\d{4}-\d{2}-\d{2}$/.test(workDate ?? '')
    ? getIsoWeekday(parseDate(workDate))
    : null;
  const hoursField = form.register('hours');
  const startTimeField = form.register('startTime');
  const endTimeField = form.register('endTime');

  const updateEndTime = (startTime: string, hours: unknown) => {
    const durationMinutes = Math.round(Number(hours) * 60);

    if (isTime(startTime) && durationMinutes >= 15 && durationMinutes <= 24 * 60) {
      form.setValue('endTime', addMinutesToTime(startTime, durationMinutes), {
        shouldValidate: true,
      });
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label>Клиент</Label>
        <Controller
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите клиента" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.clientId && (
          <p className="text-xs text-destructive">{form.formState.errors.clientId.message}</p>
        )}
        {selectedClient && selectedClient.specialDays.length > 0 && (
          <p className="text-xs leading-5 text-muted-foreground">
            Особые дни:{' '}
            {selectedClient.specialDays.map((specialDay, index) => (
              <React.Fragment key={specialDay.weekday}>
                {index > 0 && ', '}
                <span
                  className={cn(
                    specialDay.weekday === workDateWeekday && 'font-semibold text-primary',
                  )}
                >
                  {getWeekdayLabel(specialDay.weekday).toLowerCase()} —{' '}
                  {formatMoney(specialDay.rate)}/ч
                </span>
              </React.Fragment>
            ))}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="shift-date">Дата</Label>
          <Input
            className="min-w-0 px-2 sm:px-3"
            id="shift-date"
            type="date"
            {...form.register('workDate')}
          />
          {form.formState.errors.workDate && (
            <p className="text-xs text-destructive">{form.formState.errors.workDate.message}</p>
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="shift-hours">Часы</Label>
          <Input
            id="shift-hours"
            type="number"
            min="0.25"
            max="24"
            step="0.25"
            className="min-w-0 px-2 sm:px-3"
            {...hoursField}
            onChange={(event) => {
              hoursField.onChange(event);
              updateEndTime(form.getValues('startTime'), event.target.value);
            }}
          />
          {form.formState.errors.hours && (
            <p className="text-xs text-destructive">{form.formState.errors.hours.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Время смены</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0 space-y-2">
            <Label className="text-xs text-muted-foreground" htmlFor="shift-start-time">
              С
            </Label>
            <Input
              id="shift-start-time"
              type="time"
              className="min-w-0 px-2 sm:px-3"
              {...startTimeField}
              onChange={(event) => {
                startTimeField.onChange(event);
                updateEndTime(event.target.value, form.getValues('hours'));
              }}
            />
            {form.formState.errors.startTime && (
              <p className="text-xs text-destructive">{form.formState.errors.startTime.message}</p>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <Label className="text-xs text-muted-foreground" htmlFor="shift-end-time">
              До
            </Label>
            <Input
              id="shift-end-time"
              type="time"
              className="min-w-0 px-2 sm:px-3"
              {...endTimeField}
              onChange={(event) => {
                endTimeField.onChange(event);
                const startTime = form.getValues('startTime');

                if (isTime(startTime) && isTime(event.target.value)) {
                  form.setValue('hours', getDurationInMinutes(startTime, event.target.value) / 60, {
                    shouldValidate: true,
                  });
                }
              }}
            />
            {form.formState.errors.endTime && (
              <p className="text-xs text-destructive">{form.formState.errors.endTime.message}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Измените часы или время «с» — время «до» пересчитается автоматически.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Тип дня</Label>
        <Controller
          control={form.control}
          name="dayType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Обычный день</SelectItem>
                <SelectItem value="holiday">Праздничный день</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="shift-comment">Комментарий</Label>
        <Textarea
          id="shift-comment"
          className="resize-none"
          maxLength={WORK_SESSION_COMMENT_MAX_LENGTH}
          placeholder="Например: дневной сон, прогулка, важные детали"
          {...form.register('comment')}
        />
        <div className="flex items-center justify-between gap-3">
          {form.formState.errors.comment ? (
            <p className="text-xs text-destructive">{form.formState.errors.comment.message}</p>
          ) : (
            <span className="text-xs text-muted-foreground">Необязательно</span>
          )}
          <span className="text-xs text-muted-foreground">
            {comment.length}/{WORK_SESSION_COMMENT_MAX_LENGTH}
          </span>
        </div>
      </div>
    </>
  );
}

function getIsoWeekday(date: Date) {
  const day = date.getDay();

  return day === 0 ? 7 : day;
}

function getStartOfWeek(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), diff);
}

function getWeekStripDayTone(day: Date, isToday: boolean) {
  if (isToday) {
    return 'schedule-day-tone-today';
  }

  if (isWeekend(day)) {
    return 'schedule-day-tone-weekend';
  }

  return 'schedule-day-tone-weekday-a';
}

function getScheduleListDayTone(day: Date, index: number) {
  if (isWeekend(day)) {
    return 'schedule-day-tone-weekend';
  }

  return index % 2 === 0 ? 'schedule-day-tone-weekday-a' : 'schedule-day-tone-weekday-b';
}

function getSessionFormDefaults(session: WorkSession): WorkSessionFormValues {
  return {
    clientId: session.clientId,
    workDate: session.workDate,
    hours: session.hours,
    startTime: session.startTime,
    endTime: session.endTime,
    dayType: isManualHoliday(session) ? 'holiday' : 'normal',
    comment: session.comment ?? '',
  };
}

function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, timeMinutes] = time.split(':').map(Number);
  const totalMinutes = (hours * 60 + timeMinutes + minutes) % (24 * 60);

  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(
    totalMinutes % 60,
  ).padStart(2, '0')}`;
}

function getDurationInMinutes(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const start = startHours * 60 + startMinutes;
  const end = endHours * 60 + endMinutes;

  return (end - start + 24 * 60) % (24 * 60) || 24 * 60;
}

function toRateType(dayType: WorkSessionFormValues['dayType']): WorkSessionRateType | undefined {
  return dayType === 'holiday' ? 'weekend' : undefined;
}

function isManualHoliday(session: WorkSession) {
  return session.rateType === 'weekend' && !isWeekend(parseDate(session.workDate));
}

// Обычный будний день — без бейджа: это норма, бейдж только для особых ставок.
function getRateBadge(session: WorkSession) {
  if (session.rateType === 'special') {
    return { label: 'особый день', variant: 'default' } as const;
  }

  if (isManualHoliday(session)) {
    return { label: 'праздничный', variant: 'warning' } as const;
  }

  if (session.rateType === 'weekend') {
    return { label: 'выходной', variant: 'warning' } as const;
  }

  return null;
}

// Запланированная смена без бейджа: её и так видно по кнопке «Подтвердить».
function getStatusBadge(status: WorkSessionStatus) {
  if (status === 'confirmed') {
    return { label: 'отработано', variant: 'success' } as const;
  }

  if (status === 'rejected') {
    return { label: 'отклонено', variant: 'warning' } as const;
  }

  return null;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function groupByClient(sessions: WorkSession[], clients: WorkerClient[]) {
  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const groups = new Map<string, { client: ClientSummary; hours: number; amount: number }>();

  for (const session of sessions) {
    const client = clientMap.get(session.clientId) ?? session.client;
    const current = groups.get(session.clientId) ?? {
      client: {
        id: client.id,
        name: client.name,
      },
      hours: 0,
      amount: 0,
    };

    current.hours += session.hours;
    current.amount += session.totalAmount;
    groups.set(session.clientId, current);
  }

  return Array.from(groups.values()).sort((first, second) =>
    first.client.name.localeCompare(second.client.name),
  );
}
