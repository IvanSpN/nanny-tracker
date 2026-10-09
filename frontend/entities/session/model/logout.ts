import { apiRequest } from '@/shared/api/http-client';
import { useSessionStore } from './use-session-store';

// Выходим сразу, а refresh-токен отзываем на сервере в фоне: без связи выход не должен «зависать».
export function logout() {
  const { refreshToken, clearSession } = useSessionStore.getState();

  clearSession();

  if (refreshToken) {
    void apiRequest('/auth/logout', {
      method: 'POST',
      auth: false,
      body: { refreshToken },
    }).catch(() => {});
  }
}
