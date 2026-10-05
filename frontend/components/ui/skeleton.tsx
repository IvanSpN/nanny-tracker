import * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Заглушка на месте контента, пока он грузится. Цвет — полупрозрачный foreground,
 * чтобы скелетон читался на любом фоне (будни, выходные, карточки, тёмная тема).
 * Для скринридера скелетон не существует: статус загрузки объявляет контейнер.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-foreground/10 motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
