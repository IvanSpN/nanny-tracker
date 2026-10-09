'use client';

import * as React from 'react';
import { BarChart3, CalendarDays, HeartHandshake, Settings, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/entities/session/model/logout';
import { useSessionStore } from '@/entities/session/model/use-session-store';
import { useMeQuery } from '@/features/auth/api/auth.queries';
import { AuthScreen } from '@/features/auth/ui/auth-screen';
import { ClientCabinetScreen } from '@/features/client-cabinet/ui/client-cabinet-screen';
import { ClientsScreen } from '@/features/clients/ui/clients-screen';
import { ProfileScreen } from '@/features/profile/ui/profile-screen';
import { StatisticsScreen } from '@/features/statistics/ui/statistics-screen';
import { WorkerScheduleScreen } from '@/features/worker-schedule/ui/worker-schedule-screen';
import { ApiError } from '@/shared/api/http-client';
import { cn } from '@/shared/lib/utils';
import { useNavigationStore, type WorkerTab } from '@/shared/store/use-navigation-store';

const workerNavigation: Array<{
  value: WorkerTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'schedule',
    label: 'Расписание',
    icon: CalendarDays,
  },
  {
    value: 'clients',
    label: 'Клиенты',
    icon: UsersRound,
  },
  {
    value: 'stats',
    label: 'Статистика',
    icon: BarChart3,
  },
  {
    value: 'profile',
    label: 'Профиль',
    icon: Settings,
  },
];

export function AppShell() {
  const accessToken = useSessionStore((state) => state.accessToken);
  const user = useSessionStore((state) => state.user);
  const hasHydrated = useSessionStore((state) => state.hasHydrated);
  const setUser = useSessionStore((state) => state.setUser);
  const clearSession = useSessionStore((state) => state.clearSession);
  const workerTab = useNavigationStore((state) => state.workerTab);
  const setWorkerTab = useNavigationStore((state) => state.setWorkerTab);
  const meQuery = useMeQuery();

  React.useEffect(() => {
    if (meQuery.data) {
      const currentUser = useSessionStore.getState().user;

      setUser({
        ...(currentUser ?? {}),
        ...meQuery.data,
      });
    }
  }, [meQuery.data, setUser]);

  React.useEffect(() => {
    if (meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      clearSession();
    }
  }, [clearSession, meQuery.error]);

  if (!hasHydrated) {
    return <AppLoadingScreen />;
  }

  if (!accessToken) {
    return <AuthScreen />;
  }

  if (!user) {
    if (meQuery.isError) {
      return <AuthScreen />;
    }

    return <AppLoadingScreen />;
  }

  if (user.role === 'client') {
    return <ClientCabinetScreen />;
  }

  if (user.role === 'admin') {
    return <UnsupportedRoleScreen />;
  }

  return (
    <div className="min-h-dvh bg-app-surface text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl md:px-4">
        <aside className="hidden w-64 shrink-0 py-4 md:block">
          <div className="sticky top-4 rounded-lg border border-border bg-card p-3 shadow-xs">
            <div className="mb-6 flex items-center gap-3 px-2 py-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <HeartHandshake className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Nanny Tracker</p>
                <p className="text-xs text-muted-foreground">Мой рабочий кабинет</p>
              </div>
            </div>

            <nav className="space-y-1">
              {workerNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = workerTab === item.value;

                return (
                  <Button
                    key={item.value}
                    variant={isActive ? 'soft' : 'ghost'}
                    className={cn('w-full justify-start', isActive && 'text-primary')}
                    onClick={() => setWorkerTab(item.value)}
                  >
                    <Icon />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Снизу — место под нижнее меню и полоску «домой», сверху — под Dynamic Island. */}
        <main className="min-w-0 flex-1 pt-[env(safe-area-inset-top)] pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <WorkerScreenContent activeTab={workerTab} />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {workerNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = workerTab === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  className={cn(
                    'flex h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium text-muted-foreground transition-colors',
                    isActive && 'bg-primary/10 text-primary',
                  )}
                  onClick={() => setWorkerTab(item.value)}
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function AppLoadingScreen() {
  return (
    <main
      className="loading-screen-fade-in flex min-h-dvh flex-col items-center justify-center gap-4 px-4"
      aria-busy="true"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <HeartHandshake className="size-7" />
      </div>
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Загружаем кабинет…
      </p>
    </main>
  );
}

function UnsupportedRoleScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xs">
        <h1 className="text-lg font-semibold">Роль пока без интерфейса</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Кабинет admin появится отдельно. Сейчас готовы worker и client.
        </p>
        <Button className="mt-4 w-full" onClick={logout}>
          Выйти
        </Button>
      </div>
    </main>
  );
}

function WorkerScreenContent({ activeTab }: { activeTab: WorkerTab }) {
  if (activeTab === 'schedule') {
    return <WorkerScheduleScreen />;
  }

  if (activeTab === 'clients') {
    return <ClientsScreen />;
  }

  if (activeTab === 'stats') {
    return <StatisticsScreen />;
  }

  return <ProfileScreen />;
}
