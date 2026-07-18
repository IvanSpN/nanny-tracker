export type UserRole = 'worker' | 'client' | 'admin';

export type SessionUser = {
  id: string;
  role: UserRole;
  login?: string;
  email?: string | null;
};

export type AuthSession = {
  accessToken: string;
  user: SessionUser;
};
