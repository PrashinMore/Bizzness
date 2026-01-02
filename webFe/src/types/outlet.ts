export interface Outlet {
  id: string;
  organizationId: string;
  name: string;
  address?: string | null;
  contactNumber?: string | null;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

