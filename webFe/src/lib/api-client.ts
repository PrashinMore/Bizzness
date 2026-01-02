import { AuthResponse, User } from '@/types/user';
import { Product } from '@/types/product';
import { Sale } from '@/types/sale';
import { Expense } from '@/types/expense';
import { Organization } from '@/types/organization';
import { OrganizationInvite } from '@/types/invite';
import { DiningTable, DiningTableWithOrders, TableStatus } from '@/types/table';
import { Outlet } from '@/types/outlet';
import { Stock } from '@/types/stock';
import {
  Customer,
  CustomerVisit,
  CustomerNote,
  CustomerFeedback,
  CrmDashboardStats,
  ListCustomersResponse,
} from '@/types/crm';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

async function request<T>(
  path: string,
  { method = 'GET', body, token, isFormData = false }: RequestOptions & { isFormData?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Add X-Outlet-Id header if outlet is selected
  if (typeof window !== 'undefined') {
    const selectedOutletId = localStorage.getItem('selected-outlet-id');
    if (selectedOutletId) {
      headers['X-Outlet-Id'] = selectedOutletId;
    }
  }

  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : (body ? JSON.stringify(body) : undefined),
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'Unexpected error';
    try {
      const payload = await response.json();
      message = payload.message ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  // Get response text once
  const text = await response.text();
  
  // Handle empty responses
  if (!text || text.trim() === '') {
    return null as T;
  }

  // Check content type
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    // If JSON parsing fails, return null for nullable endpoints
    // This can happen when backend returns empty body or invalid JSON
    console.warn('Failed to parse JSON response:', e, 'Response text:', text.substring(0, 100));
    return null as T;
  }
}

export const authApi = {
  signup: (payload: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResponse> => request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: payload,
  }),
  login: (payload: {
    email: string;
    password: string;
  }): Promise<AuthResponse> =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: payload }),
  resetPassword: (
    token: string,
    payload: { currentPassword?: string; newPassword: string; userId?: string },
  ): Promise<void> =>
    request<void>('/auth/reset-password', {
      method: 'POST',
      body: payload,
      token,
    }),
  refresh: (refreshToken: string): Promise<AuthResponse> =>
    request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    }),
};

export const usersApi = {
  profile: (token: string): Promise<User> =>
    request<User>('/users/me', { token }),
  list: (token: string, search?: string): Promise<User[]> => {
    const path = search ? `/users?search=${encodeURIComponent(search)}` : '/users';
    return request<User[]>(path, { token });
  },
  create: (
    token: string,
    payload: { name: string; email: string; password: string; role: string },
  ): Promise<User> =>
    request<User>('/users', { method: 'POST', body: payload, token }),
  update: (
    token: string,
    id: string,
    payload: Partial<{ name: string; email: string; password: string; role: string }>,
  ): Promise<User> =>
    request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: payload,
      token,
    }),
  remove: (token: string, id: string): Promise<void> =>
    request<void>(`/users/${id}`, { method: 'DELETE', token }),
  deleteAccount: (
    token: string,
    password: string,
  ): Promise<{ message: string; scheduledHardDeleteOn: string }> =>
    request<{ message: string; scheduledHardDeleteOn: string }>('/users/me', {
      method: 'DELETE',
      body: { password },
      token,
    }),
};

type ProductFilters = {
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
  forMenu?: boolean;
};

export const productsApi = {
  list: (token: string, filters: ProductFilters = {}): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (filters.search) {
      params.set('search', filters.search);
    }
    if (filters.category) {
      params.set('category', filters.category);
    }
    if (filters.lowStockOnly) {
      params.set('lowStock', 'true');
    }
    if (filters.forMenu) {
      params.set('forMenu', 'true');
    }
    const qs = params.toString();
    const path = qs ? `/products?${qs}` : '/products';
    return request<Product[]>(path, { token });
  },
  create: (
    token: string,
    payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isLowStock'>,
    imageFile?: File,
  ): Promise<Product> => {
    if (imageFile) {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('name', payload.name);
      formData.append('category', payload.category);
      formData.append('costPrice', payload.costPrice.toString());
      formData.append('sellingPrice', payload.sellingPrice.toString());
      if (payload.stock !== undefined) {
        formData.append('stock', payload.stock.toString());
      }
      formData.append('unit', payload.unit);
      formData.append('lowStockThreshold', payload.lowStockThreshold.toString());
      if (payload.imageUrl) {
        formData.append('imageUrl', payload.imageUrl);
      }
      return request<Product>('/products', { method: 'POST', body: formData, token, isFormData: true });
    }
    return request<Product>('/products', { method: 'POST', body: payload, token });
  },
  update: (
    token: string,
    id: string,
    payload: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>,
    imageFile?: File,
  ): Promise<Product> => {
    if (imageFile) {
      const formData = new FormData();
      formData.append('image', imageFile);
      Object.keys(payload).forEach((key) => {
        const value = payload[key as keyof typeof payload];
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      return request<Product>(`/products/${id}`, { method: 'PATCH', body: formData, token, isFormData: true });
    }
    return request<Product>(`/products/${id}`, { method: 'PATCH', body: payload, token });
  },
  remove: (token: string, id: string): Promise<void> =>
    request<void>(`/products/${id}`, { method: 'DELETE', token }),
  getSuggestions: (
    token: string,
    query: string,
    limit?: number,
  ): Promise<Array<{ name: string; type: 'existing' | 'global'; score: number; category?: string }>> => {
    const params = new URLSearchParams();
    params.set('q', query);
    if (limit) {
      params.set('limit', limit.toString());
    }
    return request<Array<{ name: string; type: 'existing' | 'global'; score: number; category?: string }>>(
      `/products/suggestions?${params.toString()}`,
      { token },
    );
  },
  checkDuplicate: (
    token: string,
    name: string,
    excludeId?: string,
  ): Promise<{
    isDuplicate: boolean;
    message?: string;
    similarProduct?: { id: string; name: string };
  }> => {
    const params = new URLSearchParams();
    params.set('name', name);
    if (excludeId) {
      params.set('excludeId', excludeId);
    }
    return request<{
      isDuplicate: boolean;
      message?: string;
      similarProduct?: { id: string; name: string };
    }>(`/products/check-duplicate?${params.toString()}`, { token });
  },
  downloadTemplate: async (token: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/api/products/template`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to download template');
    }
    return response.blob();
  },
  bulkImport: async (
    token: string,
    file: File,
  ): Promise<{
    success: boolean;
    message: string;
    created: number;
    updated: number;
    errors: Array<{ row: number; error: string }>;
    totalProcessed: number;
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/products/bulk-import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to import products');
    }

    return response.json();
  },
};

export const stockApi = {
  getForOutlet: (token: string, outletId: string, productIds?: string[]): Promise<Stock[]> => {
    const params = new URLSearchParams();
    if (productIds && productIds.length > 0) {
      params.set('productIds', productIds.join(','));
    }
    const qs = params.toString();
    const path = qs ? `/stock/outlet/${outletId}?${qs}` : `/stock/outlet/${outletId}`;
    return request<Stock[]>(path, { token });
  },
  getForProduct: (token: string, productId: string): Promise<Stock | null> =>
    request<Stock | null>(`/stock/product/${productId}`, { token }),
  getLowStock: (token: string, outletId?: string): Promise<Stock[]> => {
    const params = new URLSearchParams();
    if (outletId) {
      params.set('outletId', outletId);
    }
    const qs = params.toString();
    const path = qs ? `/stock/low-stock?${qs}` : '/stock/low-stock';
    return request<Stock[]>(path, { token });
  },
  adjustStock: (token: string, productId: string, delta: number): Promise<Stock> =>
    request<Stock>(`/stock/product/${productId}/adjust`, { method: 'PATCH', body: { delta }, token }),
  setStock: (token: string, productId: string, quantity: number): Promise<Stock> =>
    request<Stock>(`/stock/product/${productId}/set`, { method: 'PATCH', body: { quantity }, token }),
};

type SalesFilters = {
  from?: string;
  to?: string;
  productId?: string;
  staff?: string;
  paymentType?: string;
  page?: number;
  size?: number;
};

export const salesApi = {
  list: (token: string, filters: SalesFilters = {}): Promise<{ sales: Sale[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.productId) params.set('productId', filters.productId);
    if (filters.staff) params.set('staff', filters.staff);
    if (filters.paymentType) params.set('paymentType', filters.paymentType);
    if (filters.page) params.set('page', filters.page.toString());
    if (filters.size) params.set('size', filters.size.toString());
    const qs = params.toString();
    const path = qs ? `/sales?${qs}` : '/sales';
    return request<{ sales: Sale[]; total: number }>(path, { token });
  },
  get: (token: string, id: string): Promise<Sale> =>
    request<Sale>(`/sales/${id}`, { token }),
  create: (token: string, payload: {
    date: string;
    items: { productId: string; quantity: number; sellingPrice: number }[];
    totalAmount: number;
    soldBy: string;
    paymentType?: string;
    isPaid?: boolean;
    tableId?: string;
  }): Promise<Sale> => request<Sale>('/sales', { method: 'POST', body: payload, token }),
  update: (token: string, id: string, payload: {
    paymentType?: string;
    isPaid?: boolean;
  }): Promise<Sale> => request<Sale>(`/sales/${id}`, { method: 'PATCH', body: payload, token }),
  addItems: (token: string, id: string, items: { productId: string; quantity: number; sellingPrice: number }[]): Promise<Sale> =>
    request<Sale>(`/sales/${id}/items`, {
      method: 'PATCH',
      body: { items },
      token,
    }),
  dailyTotals: (token: string, from?: string, to?: string): Promise<{ day: string; total: string }[]> => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    const path = qs ? `/sales/totals/daily?${qs}` : '/sales/totals/daily';
    return request(path, { token });
  },
  getPaymentTypeTotals: (token: string, filters: SalesFilters = {}): Promise<{
    cash: number;
    UPI: number;
    total: number;
  }> => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.productId) params.set('productId', filters.productId);
    if (filters.staff) params.set('staff', filters.staff);
    // Note: paymentType is intentionally excluded
    const qs = params.toString();
    const path = qs ? `/sales/totals/payment-type?${qs}` : '/sales/totals/payment-type';
    return request(path, { token });
  },
};

type ExpensesFilters = {
  from?: string;
  to?: string;
  category?: string;
  page?: number;
  size?: number;
};

export const expensesApi = {
  list: (token: string, filters: ExpensesFilters = {}): Promise<{ expenses: Expense[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.category) params.set('category', filters.category);
    if (filters.page) params.set('page', filters.page.toString());
    if (filters.size) params.set('size', filters.size.toString());
    const qs = params.toString();
    const path = qs ? `/expenses?${qs}` : '/expenses';
    return request<{ expenses: Expense[]; total: number }>(path, { token });
  },
  monthlySummary: (token: string, from?: string, to?: string): Promise<{ month: string; total: string }[]> => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    const path = qs ? `/expenses/summary/monthly?${qs}` : '/expenses/summary/monthly';
    return request(path, { token });
  },
  create: (token: string, payload: Omit<Expense, 'id' | 'createdAt'> & { date: string }): Promise<Expense> =>
    request<Expense>('/expenses', { method: 'POST', body: payload, token }),
  update: (token: string, id: string, payload: Partial<Omit<Expense, 'id' | 'createdAt'>> & { date?: string }): Promise<Expense> =>
    request<Expense>(`/expenses/${id}`, { method: 'PATCH', body: payload, token }),
  remove: (token: string, id: string): Promise<void> =>
    request<void>(`/expenses/${id}`, { method: 'DELETE', token }),
};

export const dashboardApi = {
  getSummary: (token: string): Promise<{
    totalSales: number;
    totalExpenses: number;
    costOfGoodsSold: number;
    grossProfit: number;
    netProfit: number;
    totalOrders: number;
  }> => request('/dashboard/summary', { token }),
  getSalesTrend: (token: string, range: '7days' | '30days' = '7days'): Promise<{
    date: string;
    totalSales: number;
  }[]> => {
    const params = new URLSearchParams();
    params.set('range', range);
    return request(`/dashboard/sales-trend?${params.toString()}`, { token });
  },
  getTopProducts: (token: string, limit: number = 5): Promise<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }[]> => {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    return request(`/dashboard/top-products?${params.toString()}`, { token });
  },
  getLowStock: (token: string): Promise<{
    id: string;
    name: string;
    category: string;
    stock: number;
    lowStockThreshold: number;
    unit: string;
    imageUrl: string | null;
  }[]> => request('/dashboard/low-stock', { token }),
  getExpensesSummary: (token: string): Promise<{
    category: string;
    amount: number;
    percentage: number;
  }[]> => request('/dashboard/expenses-summary', { token }),
};

export interface Settings {
  id: string;
  businessName: string | null;
  businessLogo: string | null;
  businessAddress: string | null;
  gstNumber: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  taxRate: number;
  invoicePrefix: string;
  invoiceFooter: string | null;
  currency: string;
  defaultDiscountType: string;
  defaultLowStockThreshold: number;
  defaultUnit: string;
  stockWarningAlerts: boolean;
  enableTables: boolean;
  enableReservations: boolean;
  allowTableMerge: boolean;
  autoFreeTableOnPayment: boolean;
  enableCRM: boolean;
  enableLoyalty: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export const settingsApi = {
  get: (token: string): Promise<Settings> => request('/settings', { token }),
  updateBusiness: (
    token: string,
    payload: {
      businessName?: string | null;
      businessLogo?: string | null;
      businessAddress?: string | null;
      gstNumber?: string | null;
      contactPhone?: string | null;
      contactEmail?: string | null;
    },
    logoFile?: File,
  ): Promise<Settings> => {
    if (logoFile) {
      const formData = new FormData();
      formData.append('logo', logoFile);
      Object.keys(payload).forEach((key) => {
        const value = payload[key as keyof typeof payload];
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      return request<Settings>('/settings/business', {
        method: 'PATCH',
        body: formData,
        token,
        isFormData: true,
      });
    }
    return request<Settings>('/settings/business', {
      method: 'PATCH',
      body: payload,
      token,
    });
  },
  updateBilling: (
    token: string,
    payload: {
      taxRate?: number;
      invoicePrefix?: string;
      invoiceFooter?: string | null;
      currency?: string;
      defaultDiscountType?: 'percentage' | 'fixed';
    },
  ): Promise<Settings> =>
    request<Settings>('/settings/billing', {
      method: 'PATCH',
      body: payload,
      token,
    }),
  updateInventory: (
    token: string,
    payload: {
      defaultLowStockThreshold?: number;
      defaultUnit?: string;
      stockWarningAlerts?: boolean;
    },
  ): Promise<Settings> =>
    request<Settings>('/settings/inventory', {
      method: 'PATCH',
      body: payload,
      token,
    }),
  updateTable: (
    token: string,
    payload: {
      enableTables?: boolean;
      enableReservations?: boolean;
      allowTableMerge?: boolean;
      autoFreeTableOnPayment?: boolean;
    },
  ): Promise<Settings> =>
    request<Settings>('/settings/tables', {
      method: 'PATCH',
      body: payload,
      token,
    }),
  updateOrganization: (
    token: string,
    payload: {
      enableCRM?: boolean;
      enableLoyalty?: boolean;
    },
  ): Promise<Settings> =>
    request<Settings>('/settings/organization', {
      method: 'PATCH',
      body: payload,
      token,
    }),
};

export const reportsApi = {
  getSalesReport: (
    token: string,
    from?: string,
    to?: string,
  ): Promise<{
    period: { from: string; to: string };
    summary: {
      totalSales: number;
      totalOrders: number;
      averageOrderValue: number;
    };
    productBreakdown: Array<{ name: string; quantity: number; revenue: number }>;
    staffBreakdown: Array<{ name: string; sales: number; orders: number }>;
  }> => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return request(`/reports/sales${qs ? `?${qs}` : ''}`, { token });
  },
  exportSalesReportCSV: (token: string, from?: string, to?: string): Promise<Blob> => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('export', 'csv');
    return fetch(`${API_BASE_URL}/reports/sales?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    }).then((res) => res.blob());
  },
  getProfitLossReport: (
    token: string,
    from?: string,
    to?: string,
  ): Promise<{
    period: { from: string; to: string };
    revenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
  }> => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return request(`/reports/profit-loss${qs ? `?${qs}` : ''}`, { token });
  },
  getInventoryReport: (token: string): Promise<{
    summary: {
      totalProducts: number;
      totalStockValue: number;
      lowStockItems: number;
    };
    products: Array<{
      id: string;
      name: string;
      category: string;
      stock: number;
      unit: string;
      costPrice: number;
      stockValue: number;
      salesLast30Days: number;
      movement: 'fast' | 'medium' | 'slow';
    }>;
  }> => request('/reports/inventory', { token }),
  getExpenseReport: (
    token: string,
    from?: string,
    to?: string,
  ): Promise<{
    period: { from: string; to: string };
    summary: {
      totalExpenses: number;
      totalTransactions: number;
      averageExpense: number;
    };
    categoryBreakdown: Array<{ category: string; amount: number; percentage: number }>;
    monthlyBreakdown: Array<{ month: string; amount: number }>;
  }> => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return request(`/reports/expenses${qs ? `?${qs}` : ''}`, { token });
  },
};

export const organizationsApi = {
  list: (token: string): Promise<Organization[]> =>
    request<Organization[]>('/organizations', { token }),
  get: (token: string, id: string): Promise<Organization> =>
    request<Organization>(`/organizations/${id}`, { token }),
  create: (
    token: string,
    payload: { name: string; description?: string | null },
  ): Promise<Organization> =>
    request<Organization>('/organizations', {
      method: 'POST',
      body: payload,
      token,
    }),
  update: (
    token: string,
    id: string,
    payload: Partial<{ name: string; description?: string | null }>,
  ): Promise<Organization> =>
    request<Organization>(`/organizations/${id}`, {
      method: 'PATCH',
      body: payload,
      token,
    }),
  remove: (token: string, id: string): Promise<void> =>
    request<void>(`/organizations/${id}`, { method: 'DELETE', token }),
  assignUser: (
    token: string,
    organizationId: string,
    userId: string,
  ): Promise<Organization> =>
    request<Organization>(
      `/organizations/${organizationId}/users/${userId}`,
      {
        method: 'POST',
        token,
      },
    ),
  removeUser: (
    token: string,
    organizationId: string,
    userId: string,
  ): Promise<Organization> =>
    request<Organization>(
      `/organizations/${organizationId}/users/${userId}`,
      {
        method: 'DELETE',
        token,
      },
    ),
};

export const outletsApi = {
  list: (token: string): Promise<Outlet[]> =>
    request<Outlet[]>('/outlets', { token }),
  get: (token: string, id: string): Promise<Outlet> =>
    request<Outlet>(`/outlets/${id}`, { token }),
  create: (
    token: string,
    payload: { name: string; address?: string; contactNumber?: string; isPrimary?: boolean },
  ): Promise<Outlet> =>
    request<Outlet>('/outlets', {
      method: 'POST',
      body: payload,
      token,
    }),
  update: (
    token: string,
    id: string,
    payload: Partial<{ name: string; address?: string; contactNumber?: string; isPrimary?: boolean; isActive?: boolean }>,
  ): Promise<Outlet> =>
    request<Outlet>(`/outlets/${id}`, {
      method: 'PATCH',
      body: payload,
      token,
    }),
  remove: (token: string, id: string): Promise<void> =>
    request<void>(`/outlets/${id}`, { method: 'DELETE', token }),
};

export const invoicesApi = {
  getSettings: (token: string, orgId: string): Promise<import('@/types/invoice').OrganizationInvoiceSettings> =>
    request<import('@/types/invoice').OrganizationInvoiceSettings>(
      `/organizations/${orgId}/invoices/settings`,
      { token },
    ),
  updateSettings: (
    token: string,
    orgId: string,
    payload: {
      enableInvoices?: boolean;
      gstEnabled?: boolean;
      invoicePrefix?: string;
      invoiceBranchPrefix?: boolean;
      invoiceResetCycle?: 'never' | 'monthly' | 'yearly';
      invoicePadding?: number;
      invoiceDisplayFormat?: 'A4' | 'thermal';
      includeLogo?: boolean;
      logoUrl?: string | null;
    },
  ): Promise<import('@/types/invoice').OrganizationInvoiceSettings> =>
    request<import('@/types/invoice').OrganizationInvoiceSettings>(
      `/organizations/${orgId}/invoices/settings`,
      { method: 'POST', body: payload, token },
    ),
  createFromSale: (
    token: string,
    orgId: string,
    saleId: string,
    payload: import('@/types/invoice').CreateInvoiceFromSaleDto,
  ): Promise<{
    invoice: import('@/types/invoice').Invoice;
    status: 'ready' | 'queued';
    pdfUrl?: string | null;
  }> =>
    request<{
      invoice: import('@/types/invoice').Invoice;
      status: 'ready' | 'queued';
      pdfUrl?: string | null;
    }>(`/organizations/${orgId}/invoices/from-sale/${saleId}`, {
      method: 'POST',
      body: payload,
      token,
    }),
  list: (
    token: string,
    orgId: string,
    filters?: {
      from?: string;
      to?: string;
      branch?: string;
      customer?: string;
      page?: number;
      size?: number;
    },
  ): Promise<{
    invoices: import('@/types/invoice').Invoice[];
    total: number;
  }> => {
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.branch) params.set('branch', filters.branch);
    if (filters?.customer) params.set('customer', filters.customer);
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.size) params.set('size', filters.size.toString());
    const qs = params.toString();
    return request<{
      invoices: import('@/types/invoice').Invoice[];
      total: number;
    }>(`/organizations/${orgId}/invoices${qs ? `?${qs}` : ''}`, { token });
  },
  get: (
    token: string,
    orgId: string,
    invoiceId: string,
  ): Promise<{
    invoice: import('@/types/invoice').Invoice;
    status: 'ready' | 'queued';
    pdfUrl?: string | null;
  }> =>
    request<{
      invoice: import('@/types/invoice').Invoice;
      status: 'ready' | 'queued';
      pdfUrl?: string | null;
    }>(`/organizations/${orgId}/invoices/${invoiceId}`, { token }),
  getPdfUrl: (token: string, orgId: string, invoiceId: string): string => {
    const baseUrl = API_BASE_URL;
    return `${baseUrl}/api/organizations/${orgId}/invoices/${invoiceId}/pdf`;
  },
  generatePdf: (
    token: string,
    orgId: string,
    invoiceId: string,
  ): Promise<{
    invoice: import('@/types/invoice').Invoice;
    status: 'ready' | 'queued';
    pdfUrl?: string | null;
  }> =>
    request<{
      invoice: import('@/types/invoice').Invoice;
      status: 'ready' | 'queued';
      pdfUrl?: string | null;
    }>(`/organizations/${orgId}/invoices/${invoiceId}/generate-pdf`, {
      method: 'POST',
      token,
    }),
};

export const invitesApi = {
  // Get all pending invites for current user
  getMyInvites: (token: string): Promise<OrganizationInvite[]> =>
    request<OrganizationInvite[]>('/invites/my', { token }),

  // Get all invites for an organization (admin only)
  getOrganizationInvites: (
    token: string,
    organizationId: string,
  ): Promise<OrganizationInvite[]> =>
    request<OrganizationInvite[]>(`/invites/organization/${organizationId}`, { token }),

  // Create an invite (admin only)
  create: (
    token: string,
    organizationId: string,
    payload: { email: string },
  ): Promise<OrganizationInvite> =>
    request<OrganizationInvite>(`/invites/organization/${organizationId}`, {
      method: 'POST',
      body: payload,
      token,
    }),

  // Respond to invite by ID
  respondById: (
    token: string,
    inviteId: string,
    action: 'accept' | 'decline',
  ): Promise<OrganizationInvite> =>
    request<OrganizationInvite>(`/invites/${inviteId}/respond`, {
      method: 'POST',
      body: { action },
      token,
    }),

  // Respond to invite by token
  respondByToken: (
    authToken: string,
    inviteToken: string,
    action: 'accept' | 'decline',
  ): Promise<OrganizationInvite> =>
    request<OrganizationInvite>('/invites/token/respond', {
      method: 'POST',
      body: { token: inviteToken, action },
      token: authToken,
    }),

  // Cancel an invite (admin only)
  cancel: (token: string, inviteId: string): Promise<void> =>
    request<void>(`/invites/${inviteId}`, { method: 'DELETE', token }),

  // Resend an invite (admin only)
  resend: (token: string, inviteId: string): Promise<OrganizationInvite> =>
    request<OrganizationInvite>(`/invites/${inviteId}/resend`, {
      method: 'POST',
      token,
    }),
};

export const tablesApi = {
  list: (token: string): Promise<DiningTable[]> =>
    request<DiningTable[]>('/tables', { token }),

  get: (token: string, id: string): Promise<DiningTableWithOrders> =>
    request<DiningTableWithOrders>(`/tables/${id}`, { token }),

  getActiveSale: (token: string, id: string): Promise<Sale | null> =>
    request<Sale | null>(`/tables/${id}/active-sale`, { token }),

  create: (
    token: string,
    payload: { name: string; capacity: number; area?: string },
  ): Promise<DiningTable> =>
    request<DiningTable>('/tables', {
      method: 'POST',
      body: payload,
      token,
    }),

  update: (
    token: string,
    id: string,
    payload: Partial<{ name: string; capacity: number; area?: string; isActive: boolean }>,
  ): Promise<DiningTable> =>
    request<DiningTable>(`/tables/${id}`, {
      method: 'PATCH',
      body: payload,
      token,
    }),

  updateStatus: (token: string, id: string, status: TableStatus): Promise<DiningTable> =>
    request<DiningTable>(`/tables/${id}/status`, {
      method: 'PATCH',
      body: { status },
      token,
    }),

  remove: (token: string, id: string): Promise<void> =>
    request<void>(`/tables/${id}`, { method: 'DELETE', token }),

  assignTableToSale: (token: string, saleId: string, tableId: string): Promise<{ sale: Sale; table: DiningTable }> =>
    request<{ sale: Sale; table: DiningTable }>(`/tables/sales/${saleId}/assign`, {
      method: 'POST',
      body: { tableId },
      token,
    }),

  switchTable: (token: string, saleId: string, toTableId: string): Promise<{ sale: Sale; fromTable: DiningTable | null; toTable: DiningTable }> =>
    request<{ sale: Sale; fromTable: DiningTable | null; toTable: DiningTable }>(`/tables/sales/${saleId}/switch`, {
      method: 'POST',
      body: { toTableId },
      token,
    }),

  mergeTables: (
    token: string,
    payload: { sourceTableIds: string[]; targetTableId: string },
  ): Promise<{ targetTable: DiningTable; sourceTables: DiningTable[] }> =>
    request<{ targetTable: DiningTable; sourceTables: DiningTable[] }>('/tables/merge', {
      method: 'POST',
      body: payload,
      token,
    }),
};

export const crmApi = {
  getDashboard: (token: string): Promise<CrmDashboardStats> =>
    request<CrmDashboardStats>('/crm/dashboard', { token }),

  listCustomers: (
    token: string,
    params?: {
      search?: string;
      segment?: string;
      tag?: string;
      page?: number;
      size?: number;
    },
  ): Promise<ListCustomersResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set('search', params.search);
    if (params?.segment) queryParams.set('segment', params.segment);
    if (params?.tag) queryParams.set('tag', params.tag);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.size) queryParams.set('size', params.size.toString());

    const query = queryParams.toString();
    return request<ListCustomersResponse>(`/crm/customers${query ? `?${query}` : ''}`, { token });
  },

  getCustomer: (token: string, id: string): Promise<Customer> =>
    request<Customer>(`/crm/customers/${id}`, { token }),

  createCustomer: (
    token: string,
    payload: {
      name: string;
      phone: string;
      email?: string;
      birthday?: string;
      gender?: 'MALE' | 'FEMALE' | 'OTHER';
      tags?: string[];
    },
  ): Promise<Customer> =>
    request<Customer>('/crm/customers', {
      method: 'POST',
      body: payload,
      token,
    }),

  updateCustomer: (
    token: string,
    id: string,
    payload: {
      name?: string;
      email?: string;
      birthday?: string;
      gender?: 'MALE' | 'FEMALE' | 'OTHER';
      tags?: string[];
    },
  ): Promise<Customer> =>
    request<Customer>(`/crm/customers/${id}`, {
      method: 'PATCH',
      body: payload,
      token,
    }),

  getCustomerVisits: (token: string, customerId: string): Promise<CustomerVisit[]> =>
    request<CustomerVisit[]>(`/crm/customers/${customerId}/visits`, { token }),

  createCustomerNote: (
    token: string,
    customerId: string,
    payload: { note: string },
  ): Promise<CustomerNote> =>
    request<CustomerNote>(`/crm/customers/${customerId}/notes`, {
      method: 'POST',
      body: payload,
      token,
    }),

  getCustomerNotes: (token: string, customerId: string): Promise<CustomerNote[]> =>
    request<CustomerNote[]>(`/crm/customers/${customerId}/notes`, { token }),

  createCustomerFeedback: (
    token: string,
    customerId: string,
    payload: {
      rating: number;
      comment?: string;
      orderId?: string;
    },
  ): Promise<CustomerFeedback> =>
    request<CustomerFeedback>(`/crm/customers/${customerId}/feedback`, {
      method: 'POST',
      body: payload,
      token,
    }),

  getCustomerFeedbacks: (token: string, customerId: string): Promise<CustomerFeedback[]> =>
    request<CustomerFeedback[]>(`/crm/customers/${customerId}/feedback`, { token }),

  updateFeedback: (
    token: string,
    feedbackId: string,
    payload: { status?: 'OPEN' | 'RESOLVED' },
  ): Promise<CustomerFeedback> =>
    request<CustomerFeedback>(`/crm/feedback/${feedbackId}`, {
      method: 'PATCH',
      body: payload,
      token,
    }),
};

