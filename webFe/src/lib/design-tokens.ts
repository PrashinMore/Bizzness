/** Chart palette — brass, forest, brick, amber only. No rainbow defaults. */
export const CHART_COLORS = [
  '#B8894A',
  '#2F5233',
  '#A13F3F',
  '#B8763A',
  '#1C2333',
  '#5C6270',
] as const;

export const CHART_GRID = '#D8D2C4';
export const CHART_AXIS = '#5C6270';
export const CHART_LINE = '#B8894A';

export type StockStatus = 'in-stock' | 'low' | 'out' | 'untracked';

export function getStockStatus(
  quantity: number,
  threshold: number,
  tracked: boolean,
): StockStatus {
  if (!tracked) return 'untracked';
  if (quantity <= 0) return 'out';
  if (quantity < threshold) return 'low';
  return 'in-stock';
}

export const stockStatusBorder: Record<StockStatus, string> = {
  'in-stock': 'border-l-success',
  low: 'border-l-warning',
  out: 'border-l-danger',
  untracked: 'border-l-border',
};

export const stockStatusDot: Record<StockStatus, string> = {
  'in-stock': 'bg-success',
  low: 'bg-warning',
  out: 'bg-danger',
  untracked: 'bg-border',
};
