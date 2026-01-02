import { Product } from './product';
import { Outlet } from './outlet';

export interface Stock {
  id: string;
  productId: string;
  product?: Product;
  outletId: string;
  outlet?: Outlet;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

