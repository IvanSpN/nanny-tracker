import type { AuthSession, SessionUser } from '@/entities/session/model/types';

export type LoginRequest = {
  login: string;
  password: string;
};

export type RegisterWorkerRequest = {
  name: string;
  email: string;
  login: string;
  password: string;
  phone?: string;
};

export type AuthResponse = AuthSession & {
  worker?: {
    id: string;
    name: string;
    phone: string | null;
  };
};

export type MeResponse = SessionUser;
