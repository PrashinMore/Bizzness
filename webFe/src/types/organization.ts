import { User } from './user';

export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  users?: User[];
}

