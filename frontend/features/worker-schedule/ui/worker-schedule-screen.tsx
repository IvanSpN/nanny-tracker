'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Sparkles,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
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
import { queryKeys } from '@/shared/api/query-keys';
import { formatHours, formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';
import { getWorkerDashboard } from '@/shared/mock/api';
import { mockDashboard } from '@/shared/mock/dashboard';
import type { Client, RateType, Shift } from '@/shared/types/domain';

const baseWeekStart = parseDate('2026-07-13');

const addShiftSchema = z.object({
  clientId: z.string().min(1),
  date: z.string().min(1),
  plannedHours: z.coerce.number().positive().max(24),
  rateType: z.enum(['regular', 'holiday']),
  notes: z.string().optional(),
});

type AddShiftInput = z.input<typeof addShiftSchema>;
type AddShiftValues = z.output<typeof addShiftSchema>;

export function WorkerScheduleScreen() {
  const { data = mockDashboard } = useQuery({
    queryKey: queryKeys.worker.dashboard,
    queryFn: getWorkerDashboard,
  });
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [localShifts, setLocalShifts] = React.useState<Shift[]>([]);
  const [statusOverrides, setStatusOverrides] = React.useState<Record<string, Shift['status']>>({});
  const touchStartX = React.useRef<number | null>(null);

  const weekStart = addWeeks(baseWeekStart, weekOffset);
  const weekDays = getWeekDays(weekStart);
  const weekKeys = new Set(weekDays.map(toDateKey));
  const allShifts = React.useMemo(
    () =>
      [...data.shifts, ...localShifts].map((shift) => ({
        ...shift,
        status: statusOverrides[shift.id] ?? shift.status,
      })),
    [data.shifts, localShifts, statusOverrides],
  );
  const weekShifts = allShifts.filter((shift) => weekKeys.has(shift.date));
  const confirmedShifts = weekShifts.filter((shift) => shift.status === 'confirmed');
  const weekTotalHours = sum(confirmedShifts.map((shift) => shift.actualHours));
  const weekTotalMoney = sum(
    confirmedShifts.map((shift) => shift.actualHours * shift.hourlyRateSnapshot),
  );
  const activeClientsCount = new Set(weekShifts.map((shift) => shift.clientId)).size;
  const clientMap = new Map(data.clients.map((client) => [client.id, client]));
  const groupedByClient = groupByClient(confirmedShifts, data.clients);

  const toggleShiftStatus = (shiftId: string, currentStatus: Shift['status']) => {
    setStatusOverrides((current) => ({
      ...current,
      [shiftId]: currentStatus === 'confirmed' ? 'planned' : 'confirmed',
    }));
  };

  const copyWeekToNext = () => {
    const copied = weekShifts.map((shift) => ({
      ...shift,
      id: `local-${crypto.randomUUID()}`,
      date: toDateKey(addDays(parseDate(shift.date), 7)),
      status: 'planned' as const,
    }));

    setLocalShifts((current) => [...current, ...copied]);
    setWeekOffset((current) => current + 1);
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
        <AddShiftDialog
          clients={data.clients}
          defaultDate={toDateKey(weekDays[0])}
          onAddShift={(shift) => setLocalShifts((current) => [...current, shift])}
        />
      </div>

      <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((current) => current - 1)}
        >
          <ChevronLeft />
        </Button>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div
              key={toDateKey(day)}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center rounded-md border bg-card text-center',
                isWeekend(day) && 'border-primary/20 bg-primary/5 text-primary',
              )}
            >
              <span className="text-[11px] font-medium uppercase text-muted-foreground">
                {formatShortWeekday(day)}
              </span>
              <span className="text-sm font-semibold">{day.getDate()}</span>
            </div>
          ))}
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
        <Button variant="soft" className="flex-1" onClick={copyWeekToNext}>
          <Copy />
          Копировать неделю
        </Button>
        <Button variant="outline" onClick={() => setWeekOffset(0)}>
          Сегодня
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-3">
          {weekDays.map((day) => {
            const dateKey = toDateKey(day);
            const dayShifts = weekShifts.filter((shift) => shift.date === dateKey);
            const confirmedDayHours = sum(
              dayShifts
                .filter((shift) => shift.status === 'confirmed')
                .map((shift) => shift.actualHours),
            );

            return (
              <section key={dateKey} className="rounded-lg border border-border bg-card p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold capitalize">{formatFullWeekday(day)}</h2>
                    <p className="text-sm text-muted-foreground">{formatDay(day)}</p>
                  </div>
                  <Badge variant={confirmedDayHours > 0 ? 'success' : 'muted'}>
                    {formatHours(confirmedDayHours)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {dayShifts.length === 0 && (
                    <div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                      Свободный день
                    </div>
                  )}

                  {dayShifts.map((shift) => {
                    const client = clientMap.get(shift.clientId);

                    return (
                      <ShiftRow
                        key={shift.id}
                        shift={shift}
                        client={client}
                        onToggle={() => toggleShiftStatus(shift.id, shift.status)}
                      />
                    );
                  })}
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

function ShiftRow({
  shift,
  client,
  onToggle,
}: {
  shift: Shift;
  client?: Client;
  onToggle: () => void;
}) {
  const isConfirmed = shift.status === 'confirmed';
  const amount = shift.actualHours * shift.hourlyRateSnapshot;

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
          <p className="truncate text-sm font-semibold">{client?.name ?? 'Клиент'}</p>
          <Badge variant={shift.rateType === 'holiday' ? 'warning' : 'secondary'}>
            {shift.rateType === 'holiday' ? 'выходной' : 'будний'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatHours(shift.actualHours)} · {formatMoney(shift.hourlyRateSnapshot)}/ч
        </p>
      </div>
      <div className="flex flex-col items-end justify-between gap-2">
        <p className="text-sm font-semibold">{formatMoney(amount)}</p>
        <Button size="sm" variant={isConfirmed ? 'soft' : 'outline'} onClick={onToggle}>
          {isConfirmed ? 'Отработано' : 'Подтвердить'}
        </Button>
      </div>
    </div>
  );
}

function AddShiftDialog({
  clients,
  defaultDate,
  onAddShift,
}: {
  clients: Client[];
  defaultDate: string;
  onAddShift: (shift: Shift) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<AddShiftInput, unknown, AddShiftValues>({
    resolver: zodResolver(addShiftSchema),
    defaultValues: {
      clientId: clients[0]?.id ?? '',
      date: defaultDate,
      plannedHours: 4,
      rateType: isWeekend(parseDate(defaultDate)) ? 'holiday' : 'regular',
      notes: '',
    },
  });

  React.useEffect(() => {
    form.setValue('date', defaultDate);
    form.setValue('rateType', isWeekend(parseDate(defaultDate)) ? 'holiday' : 'regular');
  }, [defaultDate, form]);

  const submit = (values: AddShiftValues) => {
    const client = clients.find((item) => item.id === values.clientId);
    const rate = values.rateType === 'holiday' ? client?.weekendRate : client?.regularRate;

    onAddShift({
      id: `local-${crypto.randomUUID()}`,
      clientId: values.clientId,
      date: values.date,
      plannedHours: values.plannedHours,
      actualHours: values.plannedHours,
      status: 'planned',
      rateType: values.rateType,
      hourlyRateSnapshot: rate ?? 0,
      notes: values.notes,
    });
    setOpen(false);
    form.reset({
      ...values,
      plannedHours: 4,
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon">
          <CalendarPlus />
        </Button>
      </DialogTrigger>
      <DialogContent className="bottom-0 top-auto w-full max-w-none translate-y-0 rounded-b-none sm:bottom-auto sm:top-1/2 sm:max-w-lg sm:-translate-y-1/2 sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Новая смена</DialogTitle>
          <DialogDescription>Плановая смена появится в выбранном дне недели.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="shift-date">Дата</Label>
              <Input id="shift-date" type="date" {...form.register('date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-hours">Часы</Label>
              <Input id="shift-hours" type="number" step="0.5" {...form.register('plannedHours')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ставка</Label>
            <Controller
              control={form.control}
              name="rateType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as RateType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Будний день</SelectItem>
                    <SelectItem value="holiday">Выходной / праздник</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift-notes">Комментарий</Label>
            <Textarea id="shift-notes" {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="submit">Добавить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function groupByClient(shifts: Shift[], clients: Client[]) {
  return clients
    .map((client) => {
      const clientShifts = shifts.filter((shift) => shift.clientId === client.id);
      const hours = sum(clientShifts.map((shift) => shift.actualHours));
      const amount = sum(clientShifts.map((shift) => shift.actualHours * shift.hourlyRateSnapshot));

      return {
        client,
        hours,
        amount,
      };
    })
    .filter((item) => item.hours > 0);
}
