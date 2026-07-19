export type UserRole = 'worker' | 'client' | 'admin';

export type SessionUser = {
  id: string;
  role: UserRole;
  login?: string;
  email?: string | null;
  isInitialPasswordChanged?: boolean;
};

export type AuthSession = {
  accessToken: string;
  user: SessionUser;
};
