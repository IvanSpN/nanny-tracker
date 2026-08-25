'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'rose' | 'coral' | 'lilac' | 'mint';

export const accentPalettes: Record<
  AccentColor,
  {
    label: string;
    primary: string;
    ring: string;
    accent: string;
    appSoft: string;
    darkAccent: string;
    darkAppSoft: string;
  }
> = {
  rose: {
    label: 'Роза',
    primary: 'oklch(0.68 0.18 350)',
    ring: 'oklch(0.68 0.18 350)',
    accent: 'oklch(0.955 0.028 350)',
    appSoft: 'oklch(0.94 0.035 350)',
    darkAccent: 'oklch(0.31 0.045 350)',
    darkAppSoft: 'oklch(0.27 0.038 350)',
  },
  coral: {
    label: 'Коралл',
    primary: 'oklch(0.69 0.17 25)',
    ring: 'oklch(0.69 0.17 25)',
    accent: 'oklch(0.955 0.028 25)',
    appSoft: 'oklch(0.94 0.04 25)',
    darkAccent: 'oklch(0.31 0.045 25)',
    darkAppSoft: 'oklch(0.27 0.04 25)',
  },
  lilac: {
    label: 'Лилак',
    primary: 'oklch(0.63 0.17 305)',
    ring: 'oklch(0.63 0.17 305)',
    accent: 'oklch(0.95 0.032 305)',
    appSoft: 'oklch(0.93 0.04 305)',
    darkAccent: 'oklch(0.31 0.048 305)',
    darkAppSoft: 'oklch(0.27 0.042 305)',
  },
  mint: {
    label: 'Мята',
    primary: 'oklch(0.61 0.13 170)',
    ring: 'oklch(0.61 0.13 170)',
    accent: 'oklch(0.95 0.03 170)',
    appSoft: 'oklch(0.93 0.04 170)',
    darkAccent: 'oklch(0.31 0.04 170)',
    darkAppSoft: 'oklch(0.27 0.036 170)',
  },
};

type ThemeState = {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeMode: 'light',
      accentColor: 'rose',
      setThemeMode: (themeMode) => set({ themeMode }),
      setAccentColor: (accentColor) => set({ accentColor }),
    }),
    {
      name: 'nanny-tracker-theme',
      partialize: (state) => ({
        themeMode: state.themeMode,
        accentColor: state.accentColor,
      }),
    },
  ),
);
