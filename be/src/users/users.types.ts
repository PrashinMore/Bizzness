import { User } from './entities/user.entity';

export type SanitizedUser = Omit<User, 'passwordHash'>;

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  user: SanitizedUser;
}

