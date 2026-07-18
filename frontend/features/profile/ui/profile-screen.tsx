'use client';

import { LogOut, Moon, Palette, Sun, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useSessionStore } from '@/entities/session/model/use-session-store';
import { cn } from '@/shared/lib/utils';
import { useNavigationStore } from '@/shared/store/use-navigation-store';
import { accentPalettes, useThemeStore, type AccentColor } from '@/shared/store/use-theme-store';

export function ProfileScreen() {
  const user = useSessionStore((state) => state.user);
  const clearSession = useSessionStore((state) => state.clearSession);
  const resetNavigation = useNavigationStore((state) => state.resetNavigation);
  const themeMode = useThemeStore((state) => state.themeMode);
  const accentColor = useThemeStore((state) => state.accentColor);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  const setAccentColor = useThemeStore((state) => state.setAccentColor);

  const logout = () => {
    clearSession();
    resetNavigation();
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6">
      <div className="mb-4">
        <p className="text-sm font-medium text-muted-foreground">Профиль</p>
        <h1 className="text-2xl font-semibold tracking-normal">Настройки кабинета</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserRound className="size-6" />
            </div>
            <div>
              <h2 className="font-semibold">{user?.login ?? 'Работник'}</h2>
              <p className="text-sm text-muted-foreground">{user?.email ?? user?.role}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Страна праздников</p>
                <p className="mt-1 font-semibold">Казахстан</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Валюта</p>
                <p className="mt-1 font-semibold">KZT</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <h2 className="font-semibold">Тема</h2>
          </div>

          <div className="mb-5 flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-3">
            <div className="flex items-center gap-2">
              {themeMode === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
              <span className="text-sm font-medium">
                {themeMode === 'dark' ? 'Тёмная' : 'Светлая'}
              </span>
            </div>
            <Switch
              checked={themeMode === 'dark'}
              onCheckedChange={(checked) => setThemeMode(checked ? 'dark' : 'light')}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(accentPalettes) as AccentColor[]).map((color) => {
              const palette = accentPalettes[color];
              const isSelected = accentColor === color;

              return (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border',
                  )}
                  onClick={() => setAccentColor(color)}
                >
                  <span
                    className="size-4 rounded-full border border-white/50 shadow-sm"
                    style={{ background: palette.primary }}
                  />
                  {palette.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Сессия</h2>
            <p className="text-sm text-muted-foreground">JWT хранится локально для MVP.</p>
          </div>
          <Badge variant="secondary">{user?.role ?? 'user'}</Badge>
        </div>
        <div className="grid gap-2">
          <Button variant="destructive" onClick={logout}>
            <LogOut />
            Выйти
          </Button>
        </div>
      </section>
    </section>
  );
}
