import { User } from './user';
import { Outlet } from './outlet';

export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  users?: User[];
  defaultOutlet?: Outlet;
}

