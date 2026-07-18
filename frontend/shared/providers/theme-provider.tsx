'use client';

import * as React from 'react';
import { accentPalettes, useThemeStore } from '@/shared/store/use-theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useThemeStore((state) => state.themeMode);
  const accentColor = useThemeStore((state) => state.accentColor);

  React.useEffect(() => {
    const root = document.documentElement;
    const palette = accentPalettes[accentColor];

    root.classList.toggle('dark', themeMode === 'dark');
    root.dataset.accent = accentColor;
    root.style.setProperty('--primary', palette.primary);
    root.style.setProperty('--ring', palette.ring);
    root.style.setProperty('--accent', palette.accent);
    root.style.setProperty('--app-soft', palette.appSoft);
  }, [accentColor, themeMode]);

  return children;
}
