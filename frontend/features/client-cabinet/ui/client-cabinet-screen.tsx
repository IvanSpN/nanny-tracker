'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Clock3, History, KeyRound, LogOut, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSessionStore } from '@/entities/session/model/use-session-store';
import { queryKeys } from '@/shared/api/query-keys';
import { formatDay, parseDate } from '@/shared/lib/date';
import { formatHours, formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';
import { getWorkerDashboard } from '@/shared/mock/api';
import { mockDashboard } from '@/shared/mock/dashboard';
import { useNavigationStore, type ClientTab } from '@/shared/store/use-navigation-store';
import type { Shift } from '@/shared/types/domain';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8),
    repeatPassword: z.string().min(8),
  })
  .refine((values) => values.newPassword === values.repeatPassword, {
    message: 'Пароли не совпадают',
    path: ['repeatPassword'],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

const clientNavigation: Array<{
  value: ClientTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'overview',
    label: 'Обзор',
    icon: BarChart3,
  },
  {
    value: 'history',
    label: 'История',
    icon: History,
  },
  {
    value: 'profile',
    label: 'Профиль',
    icon: UserRound,
  },
];

export function ClientCabinetScreen() {
  const { data = mockDashboard } = useQuery({
    queryKey: queryKeys.worker.dashboard,
    queryFn: getWorkerDashboard,
  });
  const clientTab = useNavigationStore((state) => state.clientTab);
  const setClientTab = useNavigationStore((state) => state.setClientTab);
  const clearSession = useSessionStore((state) => state.clearSession);
  const user = useSessionStore((state) => state.user);
  const client = data.clients[0];
  const confirmedShifts = data.shifts.filter(
    (shift) => shift.clientId === client.id && shift.status === 'confirmed',
  );

  return (
    <div className="min-h-dvh bg-app-surface pb-24 text-foreground">
      <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Кабинет клиента</p>
            <h1 className="text-2xl font-semibold tracking-normal">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{user?.login}</p>
          </div>
          <Button variant="outline" size="sm" onClick={clearSession}>
            Выйти
          </Button>
        </div>

        {user?.isInitialPasswordChanged === false && (
          <div className="mb-4 rounded-lg border border-warning/25 bg-warning/10 px-4 py-3">
            <p className="text-sm font-medium">Рекомендуем сменить временный пароль</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Работник видел этот пароль при создании доступа или после сброса.
            </p>
          </div>
        )}

        {clientTab === 'overview' && <ClientOverview shifts={confirmedShifts} />}
        {clientTab === 'history' && <ClientHistory shifts={confirmedShifts} />}
        {clientTab === 'profile' && <ClientProfile onLogout={clearSession} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
          {clientNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = clientTab === item.value;

            return (
              <button
                key={item.value}
                type="button"
                className={cn(
                  'flex h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium text-muted-foreground transition-colors',
                  isActive && 'bg-primary/10 text-primary',
                )}
                onClick={() => setClientTab(item.value)}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function ClientOverview({ shifts }: { shifts: Shift[] }) {
  const monthShifts = shifts.filter((shift) => shift.date.startsWith('2026-07'));
  const hours = sum(monthShifts.map((shift) => shift.actualHours));
  const amount = sum(monthShifts.map(shiftAmount));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Clock3 className="size-4" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Июль</p>
            <p className="text-xl font-semibold">{formatHours(hours)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <BarChart3 className="size-4" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">К оплате</p>
            <p className="text-xl font-semibold">{formatMoney(amount)}</p>
          </CardContent>
        </Card>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Последние смены</h2>
          <Badge variant="success">подтверждено</Badge>
        </div>
        <div className="space-y-2">
          {monthShifts.slice(0, 4).map((shift) => (
            <ShiftHistoryRow key={shift.id} shift={shift} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ClientHistory({ shifts }: { shifts: Shift[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold">История</h2>
        <Badge variant="secondary">{shifts.length}</Badge>
      </div>
      <div className="space-y-2">
        {shifts.map((shift) => (
          <ShiftHistoryRow key={shift.id} shift={shift} />
        ))}
      </div>
    </section>
  );
}

function ClientProfile({ onLogout }: { onLogout: () => void }) {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      repeatPassword: '',
    },
  });
  const [saved, setSaved] = React.useState(false);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          <h2 className="font-semibold">Смена пароля</h2>
        </div>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit(() => {
            setSaved(true);
            form.reset();
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="current-password">Текущий пароль</Label>
            <Input id="current-password" type="password" {...form.register('currentPassword')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Новый пароль</Label>
            <Input id="new-password" type="password" {...form.register('newPassword')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repeat-password">Повторите пароль</Label>
            <Input id="repeat-password" type="password" {...form.register('repeatPassword')} />
            {form.formState.errors.repeatPassword && (
              <p className="text-xs text-destructive">
                {form.formState.errors.repeatPassword.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Сохранить пароль
          </Button>
          {saved && <Badge variant="success">Пароль обновлён</Badge>}
        </form>
      </section>

      <Button variant="destructive" className="w-full" onClick={onLogout}>
        <LogOut />
        Выйти
      </Button>
    </div>
  );
}

function ShiftHistoryRow({ shift }: { shift: Shift }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
      <div>
        <p className="text-sm font-medium">{formatDay(parseDate(shift.date))}</p>
        <p className="text-xs text-muted-foreground">{formatHours(shift.actualHours)}</p>
      </div>
      <p className="font-semibold">{formatMoney(shiftAmount(shift))}</p>
    </div>
  );
}

function shiftAmount(shift: Shift) {
  return shift.actualHours * shift.hourlyRateSnapshot;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
