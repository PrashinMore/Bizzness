export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  sellingPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  totalAmount: number;
  soldBy: string;
  paymentType: string;
  isPaid: boolean;
  outletId: string;
  tableId?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
}


