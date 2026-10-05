import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nanny Work Tracker',
  description: 'Учёт рабочего времени и клиентский кабинет',
};

// cover — страница на весь экран iPhone, под вырезы. Без него env(safe-area-inset-*) = 0,
// и отступы под Dynamic Island и полоску «домой» не работают.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
