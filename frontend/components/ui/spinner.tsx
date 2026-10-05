import * as React from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <LoaderCircle
      data-slot="spinner"
      aria-hidden="true"
      className={cn(
        'size-4 animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Невидимое сообщение для скринридера «идёт загрузка». Рендерится всегда,
 * меняется только текст: live-регион, добавленный в DOM вместе с текстом, не озвучивается.
 */
function LoadingStatus({ active, label = 'Загрузка…' }: { active: boolean; label?: string }) {
  return (
    <span role="status" className="sr-only">
      {active ? label : ''}
    </span>
  );
}

export { LoadingStatus, Spinner };
