export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'BLOCKED';

export interface DiningTable {
  id: string;
  name: string;
  capacity: number;
  area?: string | null;
  status: TableStatus;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiningTableWithOrders extends DiningTable {
  activeOrder?: import('./sale').Sale;
  orderHistory?: import('./sale').Sale[];
}
