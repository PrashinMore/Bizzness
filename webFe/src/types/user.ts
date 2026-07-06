import { Organization } from './organization';

export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizations?: Organization[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  needsOrganization?: boolean;
}

export function userHasOrganization(user: User | null | undefined): boolean {
  return Boolean(user?.organizations && user.organizations.length > 0);
}

