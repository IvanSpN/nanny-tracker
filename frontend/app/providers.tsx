'use client';

import * as React from 'react';
import { QueryProvider } from '@/shared/providers/query-provider';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import { GlobalLoadingBar } from '@/shared/ui/global-loading-bar';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <GlobalLoadingBar />
        {children}
      </ThemeProvider>
    </QueryProvider>
  );
}
