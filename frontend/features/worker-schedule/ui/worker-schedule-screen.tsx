'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  MessageSquareText,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Controller, useForm, useWatch, type UseFormReturn } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { useClientsQuery } from '@/entities/client/api/client.queries';
import type { WorkerClient } from '@/entities/client/model/types';
import {
  useCreateWorkSessionMutation,
  useDeleteWorkSessionMutation,
  useUpdateWorkSessionMutation,
  useUpdateWorkSessionStatusMutation,
} from '@/entities/work-session/api/work-session.mutations';
import { useWorkSessionsQuery } from '@/entities/work-session/api/work-session.queries';
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
  isWeekend,
  parseDate,
  toDateKey,
} from '@/shared/lib/date';
import { formatHours, formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';

const WORK_SESSION_COMMENT_MAX_LENGTH = 240;

const workSessionFormSchema = z.object({
  clientId: z.string().min(1, 'Выберите клиента'),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату'),
  hours: z.coerce.number().min(0.25, 'Минимум 15 минут').max(24, 'Максимум 24 часа'),
  dayType: z.enum(['normal', 'holiday']),
  comment: z
    .string()
    .max(WORK_SESSION_COMMENT_MAX_LENGTH, 'Комментарий до 240 символов')
    .optional(),
});

const workSessionCommentSchema = z.object({
  comment: z.string().max(WORK_SESSION_COMMENT_MAX_LENGTH, 'Комментарий до 240 символов'),
});

type WorkSessionFormInput = z.input<typeof workSessionFormSchema>;
type WorkSessionFormValues = z.output<typeof workSessionFormSchema>;
type WorkSessionCommentValues = z.infer<typeof workSessionCommentSchema>;
type ClientSummary = {
  id: string;
  name: string;
};

export function WorkerScheduleScreen() {
  const clientsQuery = useClientsQuery();
  const clients = Array.isArray(clientsQuery.data) ? clientsQuery.data : [];
  const activeClients = clients.filter((client) => client.isActive);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [copyError, setCopyError] = React.useState<string | null>(null);
  const [noClientsMessage, setNoClientsMessage] = React.useState<string | null>(null);
  const [addSessionDate, setAddSessionDate] = React.useState<string | null>(null);
  const touchStartX = React.useRef<number | null>(null);
  const baseWeekStart = React.useMemo(() => getStartOfWeek(new Date()), []);
  const todayKey = React.useMemo(() => toDateKey(new Date()), []);
  const weekStart = addWeeks(baseWeekStart, weekOffset);
  const weekDays = getWeekDays(weekStart);
  const dateFrom = toDateKey(weekDays[0]);
  const dateTo = toDateKey(weekDays[6]);
  const workSessionsQuery = useWorkSessionsQuery({ dateFrom, dateTo });
  const updateStatusMutation = useUpdateWorkSessionStatusMutation();
  const deleteWorkSessionMutation = useDeleteWorkSessionMutation();
  const copyWorkSessionMutation = useCreateWorkSessionMutation();
  const weekKeys = new Set(weekDays.map(toDateKey));
  const workSessions = Array.isArray(workSessionsQuery.data) ? workSessionsQuery.data : [];
  const weekSessions = workSessions.filter((session) => weekKeys.has(session.workDate));
  const confirmedSessions = weekSessions.filter((session) => session.status === 'confirmed');
  const weekTotalHours = sum(confirmedSessions.map((session) => session.hours));
  const weekTotalMoney = sum(confirmedSessions.map((session) => session.amount));
  const activeClientsCount = new Set(weekSessions.map((session) => session.clientId)).size;
  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const groupedByClient = groupByClient(confirmedSessions, clients);
  const isScheduleLoading = workSessionsQuery.isLoading || clientsQuery.isLoading;
  const isAddSessionDisabled = clientsQuery.isLoading;
  const mutationError =
    updateStatusMutation.error ?? deleteWorkSessionMutation.error ?? copyWorkSessionMutation.error;

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

  const copyWeekToNext = async () => {
    setCopyError(null);

    try {
      for (const session of weekSessions) {
        await copyWorkSessionMutation.mutateAsync({
          clientId: session.clientId,
          workDate: toDateKey(addDays(parseDate(session.workDate), 7)),
          hours: session.hours,
          rateType: isManualHoliday(session) ? 'weekend' : undefined,
          comment: session.comment,
        });
      }

      setWeekOffset((current) => current + 1);
    } catch (error) {
      setCopyError(getApiErrorMessage(error));
    }
  };

  return (
    <section
      className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) {
          return;
        }

        const delta = event.changedTouches[0].clientX - touchStartX.current;

        if (Math.abs(delta) > 56) {
          setWeekOffset((current) => current + (delta < 0 ? 1 : -1));
        }

        touchStartX.current = null;
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Расписание</p>
          <h1 className="text-2xl font-semibold tracking-normal">
            {formatDayRange(weekDays[0], weekDays[6])}
          </h1>
        </div>
        <Button
          size="icon"
          disabled={isAddSessionDisabled}
          title="Добавить смену"
          onClick={() => openAddSessionDialog(dateFrom)}
        >
          <CalendarPlus />
        </Button>
      </div>

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

      {(clientsQuery.isError ||
        workSessionsQuery.isError ||
        mutationError ||
        copyError ||
        noClientsMessage) && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {clientsQuery.isError && <p>{getApiErrorMessage(clientsQuery.error)}</p>}
          {workSessionsQuery.isError && <p>{getApiErrorMessage(workSessionsQuery.error)}</p>}
          {mutationError && <p>{getApiErrorMessage(mutationError)}</p>}
          {copyError && <p>{copyError}</p>}
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

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Metric title="Часы" value={formatHours(weekTotalHours)} icon={Clock3} />
        <Metric title="Доход" value={formatMoney(weekTotalMoney)} icon={Sparkles} />
        <Metric title="Клиенты" value={String(activeClientsCount)} icon={CheckCircle2} />
      </div>

      <div className="mb-5 flex gap-2">
        <Button
          variant="soft"
          className="flex-1"
          disabled={weekSessions.length === 0 || copyWorkSessionMutation.isPending}
          onClick={() => void copyWeekToNext()}
        >
          <Copy />
          {copyWorkSessionMutation.isPending ? 'Копируем...' : 'Копировать неделю'}
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
            const confirmedDayHours = sum(
              daySessions
                .filter((session) => session.status === 'confirmed')
                .map((session) => session.hours),
            );

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
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isAddSessionDisabled}
                      title="Добавить смену в этот день"
                      onClick={() => openAddSessionDialog(dateKey)}
                    >
                      <CalendarPlus />
                    </Button>
                    <Badge variant={confirmedDayHours > 0 ? 'success' : 'muted'}>
                      {formatHours(confirmedDayHours)}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  {isScheduleLoading && (
                    <div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                      Загружаем смены...
                    </div>
                  )}

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
                        isDeletePending={deleteWorkSessionMutation.isPending}
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
              {groupedByClient.length === 0 && (
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

          {!clientsQuery.isLoading && activeClients.length === 0 && (
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
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function WorkSessionRow({
  session,
  client,
  clients,
  isStatusPending,
  isDeletePending,
  onToggle,
  onDelete,
}: {
  session: WorkSession;
  client?: WorkerClient;
  clients: WorkerClient[];
  isStatusPending: boolean;
  isDeletePending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isConfirmed = session.status === 'confirmed';
  const clientName = client?.name ?? session.client.name;

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto] gap-3 rounded-md border p-3 transition-colors',
        isConfirmed ? 'border-success/25 bg-success/5' : 'border-border bg-background',
      )}
      onDoubleClick={onToggle}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{clientName}</p>
          <Badge variant={session.rateType === 'weekend' ? 'warning' : 'secondary'}>
            {getRateBadgeLabel(session)}
          </Badge>
          <Badge variant={getStatusBadgeVariant(session.status)}>
            {getStatusLabel(session.status)}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatHours(session.hours)} · {formatMoney(session.rateValue)}/ч
        </p>
        {session.comment && (
          <p className="mt-2 line-clamp-3 rounded-md bg-muted/70 px-2 py-1.5 text-xs text-muted-foreground">
            {session.comment}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end justify-between gap-2">
        <p className="text-sm font-semibold">{formatMoney(session.amount)}</p>
        <div className="flex items-center gap-1">
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
          onClick={onToggle}
        >
          {isConfirmed ? 'Отработано' : 'Подтвердить'}
        </Button>
      </div>
    </div>
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
      <DialogContent className="bottom-0 top-auto w-full max-w-none translate-y-0 rounded-b-none sm:bottom-auto sm:top-1/2 sm:max-w-md sm:-translate-y-1/2 sm:rounded-lg">
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
                onClick={() => void deleteComment()}
              >
                <Trash2 />
                {isPending ? 'Удаляем...' : 'Удалить'}
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохраняем...' : 'Сохранить'}
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
      <DialogContent className="bottom-0 top-auto w-full max-w-none translate-y-0 rounded-b-none sm:bottom-auto sm:top-1/2 sm:max-w-md sm:-translate-y-1/2 sm:rounded-lg">
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
        hours: values.hours,
        rateType: toRateType(values.dayType),
        comment: values.comment?.trim() || null,
      });

      onOpenChange(false);
      form.reset({
        clientId: values.clientId,
        workDate: values.workDate,
        hours: 4,
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
      <DialogContent className="bottom-0 top-auto w-full max-w-none translate-y-0 rounded-b-none sm:bottom-auto sm:top-1/2 sm:max-w-lg sm:-translate-y-1/2 sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Новая смена</DialogTitle>
          <DialogDescription>
            Смена будет сохранена в расписании текущего работника.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <WorkSessionFormFields form={form} clients={clients} />

          {createWorkSessionMutation.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {getApiErrorMessage(createWorkSessionMutation.error)}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={createWorkSessionMutation.isPending}>
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
          hours: values.hours,
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
      <DialogContent className="bottom-0 top-auto w-full max-w-none translate-y-0 rounded-b-none sm:bottom-auto sm:top-1/2 sm:max-w-lg sm:-translate-y-1/2 sm:rounded-lg">
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
            <Button type="submit" disabled={updateWorkSessionMutation.isPending}>
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="shift-date">Дата</Label>
          <Input id="shift-date" type="date" {...form.register('workDate')} />
          {form.formState.errors.workDate && (
            <p className="text-xs text-destructive">{form.formState.errors.workDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="shift-hours">Часы</Label>
          <Input id="shift-hours" type="number" step="0.25" {...form.register('hours')} />
          {form.formState.errors.hours && (
            <p className="text-xs text-destructive">{form.formState.errors.hours.message}</p>
          )}
        </div>
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
    dayType: isManualHoliday(session) ? 'holiday' : 'normal',
    comment: session.comment ?? '',
  };
}

function toRateType(dayType: WorkSessionFormValues['dayType']): WorkSessionRateType | undefined {
  return dayType === 'holiday' ? 'weekend' : undefined;
}

function isManualHoliday(session: WorkSession) {
  return session.rateType === 'weekend' && !isWeekend(parseDate(session.workDate));
}

function getRateBadgeLabel(session: WorkSession) {
  if (isManualHoliday(session)) {
    return 'праздничный';
  }

  if (session.rateType === 'weekend') {
    return 'выходной';
  }

  return 'будний';
}

function getStatusBadgeVariant(status: WorkSessionStatus) {
  if (status === 'confirmed') {
    return 'success';
  }

  if (status === 'rejected') {
    return 'warning';
  }

  return 'muted';
}

function getStatusLabel(status: WorkSessionStatus) {
  if (status === 'confirmed') {
    return 'отработано';
  }

  if (status === 'rejected') {
    return 'отклонено';
  }

  return 'план';
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
    current.amount += session.amount;
    groups.set(session.clientId, current);
  }

  return Array.from(groups.values()).sort((first, second) =>
    first.client.name.localeCompare(second.client.name),
  );
}
