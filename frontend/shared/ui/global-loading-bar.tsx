'use client';

import { useIsFetching, useIsMutating } from '@tanstack/react-query';

/**
 * Тонкая полоска сверху экрана, пока идёт любой запрос: фоновое обновление,
 * сохранение, переключение недели. Первую загрузку экрана показывают скелетоны,
 * а полоска сообщает, что данные обновляются, когда старые уже на экране.
 * Задержка появления и анимация — в globals.css (.global-loading-bar).
 */
export function GlobalLoadingBar() {
  const isActive = useIsFetching() + useIsMutating() > 0;

  return <div aria-hidden="true" className="global-loading-bar" data-active={isActive} />;
}
