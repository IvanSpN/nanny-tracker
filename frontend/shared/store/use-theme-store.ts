'use client';

import { create } from 'zustand';

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
  }
> = {
  rose: {
    label: 'Роза',
    primary: 'oklch(0.68 0.18 350)',
    ring: 'oklch(0.68 0.18 350)',
    accent: 'oklch(0.955 0.028 350)',
    appSoft: 'oklch(0.94 0.035 350)',
  },
  coral: {
    label: 'Коралл',
    primary: 'oklch(0.69 0.17 25)',
    ring: 'oklch(0.69 0.17 25)',
    accent: 'oklch(0.955 0.028 25)',
    appSoft: 'oklch(0.94 0.04 25)',
  },
  lilac: {
    label: 'Лилак',
    primary: 'oklch(0.63 0.17 305)',
    ring: 'oklch(0.63 0.17 305)',
    accent: 'oklch(0.95 0.032 305)',
    appSoft: 'oklch(0.93 0.04 305)',
  },
  mint: {
    label: 'Мята',
    primary: 'oklch(0.61 0.13 170)',
    ring: 'oklch(0.61 0.13 170)',
    accent: 'oklch(0.95 0.03 170)',
    appSoft: 'oklch(0.93 0.04 170)',
  },
};

type ThemeState = {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'light',
  accentColor: 'rose',
  setThemeMode: (themeMode) => set({ themeMode }),
  setAccentColor: (accentColor) => set({ accentColor }),
}));
