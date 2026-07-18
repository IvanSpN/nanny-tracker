import { UserRole } from '../models/user.model';

export type CreateUserData = {
  login: string;
  email: string | null;
  passwordHash: string;
  role: UserRole;
};
