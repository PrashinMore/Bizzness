export type InventoryType = 'NONE' | 'SIMPLE' | 'RECIPE';

/**
 * Returned by GET /products. Old rows may not have the inventory fields
 * until the backend migration has run, so both are optional on the wire.
 */
export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock?: number;
  unit: string;
  lowStockThreshold: number;
  imageUrl: string | null;
  /** Defaults to true on the backend; may be undefined on pre-migration rows. */
  trackInventory?: boolean;
  /** Defaults to 'SIMPLE' on the backend. Treat undefined as 'SIMPLE'. */
  inventoryType?: InventoryType;
  createdAt: string;
  updatedAt: string;
}
