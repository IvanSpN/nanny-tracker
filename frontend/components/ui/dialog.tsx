'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn('fixed inset-0 z-50 bg-black/35', className)}
      {...props}
    />
  );
}

let openDialogsCount = 0;

// iOS Safari при открытой клавиатуре уменьшает только видимую область (visual viewport),
// а окно с `fixed bottom-0` остаётся привязано к низу страницы — под клавиатурой.
// Пока окно открыто, отдаём в CSS размеры видимой области и высоту клавиатуры.
function DialogViewportSync() {
  React.useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    let frame = 0;
    let lastHeight = 0;

    const sync = () => {
      if (!viewport) return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // При увеличении двумя пальцами видимая область тоже меньше, но это не клавиатура.
        const isZoomed = viewport.scale > 1.01;
        const height = isZoomed ? window.innerHeight : viewport.height;
        const top = isZoomed ? 0 : viewport.offsetTop;
        const keyboardInset = Math.max(0, window.innerHeight - height - top);

        root.style.setProperty('--visual-viewport-height', `${height}px`);
        root.style.setProperty('--visual-viewport-top', `${top}px`);
        root.style.setProperty('--keyboard-inset', `${keyboardInset}px`);

        // Окно стало ниже — возвращаем в видимую часть поле, в котором стоит курсор.
        const active = document.activeElement;
        if (
          height !== lastHeight &&
          active instanceof HTMLElement &&
          active.closest('[data-slot="dialog-content"]')
        ) {
          active.scrollIntoView({ block: 'nearest' });
        }
        lastHeight = height;
      });
    };

    openDialogsCount += 1;
    sync();
    viewport?.addEventListener('resize', sync);
    viewport?.addEventListener('scroll', sync);

    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', sync);
      viewport?.removeEventListener('scroll', sync);
      openDialogsCount -= 1;

      if (openDialogsCount === 0) {
        root.style.removeProperty('--visual-viewport-height');
        root.style.removeProperty('--visual-viewport-top');
        root.style.removeProperty('--keyboard-inset');
      }
    };
  }, []);

  return null;
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // Телефон: шторка снизу над клавиатурой, не выше видимой области, лишнее прокручивается.
          // Отступ под полоску «домой» — только без клавиатуры: открытая клавиатура её закрывает.
          'fixed bottom-[var(--keyboard-inset,0px)] left-1/2 z-50 grid max-h-[calc(var(--visual-viewport-height,100dvh)-1rem)] w-full -translate-x-1/2 gap-4 overflow-y-auto overscroll-contain rounded-t-lg border border-border bg-background p-5 pb-[calc(1.25rem+max(0px,env(safe-area-inset-bottom)-var(--keyboard-inset,0px)))] shadow-lg outline-none will-change-[filter,opacity,scale,translate]',
          // Планшет и десктоп: окно по центру видимой области.
          'sm:bottom-auto sm:top-[calc(var(--visual-viewport-top,0px)+var(--visual-viewport-height,100dvh)/2)] sm:max-h-[calc(var(--visual-viewport-height,100dvh)-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-y-1/2 sm:rounded-lg sm:pb-5',
          // Заголовок не заезжает под крестик.
          showCloseButton && '[&_[data-slot=dialog-header]]:pr-12',
          className,
        )}
        {...props}
      >
        <DialogViewportSync />
        {children}
        {showCloseButton && (
          // 44×44 с рамкой — чтобы попадать пальцем на телефоне.
          <DialogPrimitive.Close asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-3 top-3 size-11 [&_svg]:size-5"
            >
              <X />
              <span className="sr-only">Закрыть</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 text-left', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg font-semibold leading-none', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
