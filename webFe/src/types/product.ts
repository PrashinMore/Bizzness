export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  unit: string;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
  isLowStock?: boolean;
}

