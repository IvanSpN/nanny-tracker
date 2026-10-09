import { useSessionStore } from '@/entities/session/model/use-session-store';
import { env } from '@/shared/config/env';

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Один запрос на обновление токена для всех параллельных запросов с 401.
let refreshInFlight: Promise<string | null> | null = null;

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { body, auth = true, headers, ...requestOptions } = options;
  const requestBody =
    body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body);

  const send = (token: string | null) => {
    const requestHeaders = new Headers(headers);

    if (body !== undefined && !(body instanceof FormData)) {
      requestHeaders.set('Content-Type', 'application/json');
    }

    if (auth && token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    return fetch(`${env.apiUrl}${path}`, {
      ...requestOptions,
      body: requestBody,
      headers: requestHeaders,
    });
  };

  const sentToken = useSessionStore.getState().accessToken;
  let response = await send(sentToken);

  if (response.status === 401 && auth && sentToken) {
    const freshToken = await refreshAccessToken(sentToken);

    if (freshToken) {
      response = await send(freshToken);
    }
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload), response.status, payload);
  }

  return payload as TResponse;
}

async function refreshAccessToken(rejectedToken: string): Promise<string | null> {
  const currentToken = useSessionStore.getState().accessToken;

  // Параллельный запрос уже обновил токен — берём новый, а не обновляем второй раз.
  if (currentToken && currentToken !== rejectedToken) {
    return currentToken;
  }

  if (!refreshInFlight) {
    refreshInFlight = requestNewAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

// null — обновить нельзя, нужен повторный вход. Сетевая ошибка или сбой сервера
// пробрасываются как есть: на плохой связи человека нельзя разлогинивать.
async function requestNewAccessToken(): Promise<string | null> {
  const { refreshToken, setAccessToken, clearSession } = useSessionStore.getState();

  // Сессия, начатая до появления refresh-токенов: обновлять нечем.
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${env.apiUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const payload = await parseResponse(response);

  if (response.ok && isRecord(payload) && typeof payload.accessToken === 'string') {
    setAccessToken(payload.accessToken);

    return payload.accessToken;
  }

  if (response.status === 401) {
    clearSession();

    return null;
  }

  throw new ApiError(getErrorMessage(payload), response.status, payload);
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Что-то пошло не так';
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type');

  if (response.status === 204) {
    return null;
  }

  if (contentType?.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

function getErrorMessage(payload: unknown) {
  if (isRecord(payload)) {
    const message = payload.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Ошибка запроса';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
