import { UserRole } from '../../users/models/user.model';

export type JwtPayload = {
  sub: string;
  role: UserRole;
};
