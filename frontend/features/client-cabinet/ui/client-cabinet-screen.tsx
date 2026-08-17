'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { BarChart3, Clock3, History, KeyRound, LogOut, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentClientQuery } from '@/entities/client/api/client.queries';
import { useSessionStore } from '@/entities/session/model/use-session-store';
import { useWorkSessionsQuery } from '@/entities/work-session/api/work-session.queries';
import type { WorkSession } from '@/entities/work-session/model/types';
import { getApiErrorMessage } from '@/shared/api/http-client';
import { addDays, formatDay, parseDate, toDateKey } from '@/shared/lib/date';
import { formatHours, formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';
import { useNavigationStore, type ClientTab } from '@/shared/store/use-navigation-store';

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
  const clientTab = useNavigationStore((state) => state.clientTab);
  const setClientTab = useNavigationStore((state) => state.setClientTab);
  const clearSession = useSessionStore((state) => state.clearSession);
  const user = useSessionStore((state) => state.user);
  const currentClientQuery = useCurrentClientQuery();
  const today = new Date();
  const dateFrom = toDateKey(addDays(today, -370));
  const dateTo = toDateKey(addDays(today, 60));
  const workSessionsQuery = useWorkSessionsQuery({ dateFrom, dateTo });
  const client = currentClientQuery.data;
  const confirmedSessions = (workSessionsQuery.data ?? []).filter(
    (session) => session.status === 'confirmed',
  );

  return (
    <div className="min-h-dvh bg-app-surface pb-24 text-foreground">
      <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Кабинет клиента</p>
            <h1 className="text-2xl font-semibold tracking-normal">{client?.name ?? 'Клиент'}</h1>
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

        {(currentClientQuery.isError || workSessionsQuery.isError) && (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {currentClientQuery.isError && <p>{getApiErrorMessage(currentClientQuery.error)}</p>}
            {workSessionsQuery.isError && <p>{getApiErrorMessage(workSessionsQuery.error)}</p>}
          </div>
        )}

        {(currentClientQuery.isLoading || workSessionsQuery.isLoading) && (
          <div className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Загружаем кабинет...
          </div>
        )}

        {!currentClientQuery.isLoading && !workSessionsQuery.isLoading && (
          <>
            {clientTab === 'overview' && <ClientOverview sessions={confirmedSessions} />}
            {clientTab === 'history' && <ClientHistory sessions={confirmedSessions} />}
          </>
        )}
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

function ClientOverview({ sessions }: { sessions: WorkSession[] }) {
  const monthKey = toDateKey(new Date()).slice(0, 7);
  const monthSessions = sessions.filter((session) => session.workDate.startsWith(monthKey));
  const hours = sum(monthSessions.map((session) => session.hours));
  const amount = sum(monthSessions.map((session) => session.amount));

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
          {monthSessions.length === 0 && (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Подтверждённых смен за месяц пока нет.
            </p>
          )}

          {monthSessions.slice(0, 4).map((session) => (
            <SessionHistoryRow key={session.id} session={session} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ClientHistory({ sessions }: { sessions: WorkSession[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold">История</h2>
        <Badge variant="secondary">{sessions.length}</Badge>
      </div>
      <div className="space-y-2">
        {sessions.length === 0 && (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
            Подтверждённых смен пока нет.
          </p>
        )}

        {sessions.map((session) => (
          <SessionHistoryRow key={session.id} session={session} />
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

function SessionHistoryRow({ session }: { session: WorkSession }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{formatDay(parseDate(session.workDate))}</p>
          <p className="text-xs text-muted-foreground">{formatHours(session.hours)}</p>
        </div>
        <p className="shrink-0 font-semibold">{formatMoney(session.amount)}</p>
      </div>
      {session.comment && (
        <div className="mt-2 border-t border-border/60 pt-2">
          <p className="line-clamp-3 text-xs text-muted-foreground">{session.comment}</p>
        </div>
      )}
    </div>
  );
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
