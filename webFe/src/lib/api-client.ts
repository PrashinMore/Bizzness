import { AuthResponse, User } from '@/types/user';
import { Product } from '@/types/product';
import { Sale } from '@/types/sale';
import { Expense } from '@/types/expense';
import { Organization } from '@/types/organization';

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

  return (await response.json()) as T;
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
};

export const usersApi = {
  profile: (token: string): Promise<User> =>
    request<User>('/users/me', { token }),
  list: (token: string): Promise<User[]> =>
    request<User[]>('/users', { token }),
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
      formData.append('stock', payload.stock.toString());
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
    payload: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isLowStock'>>,
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
  adjustStock: (token: string, id: string, delta: number): Promise<Product> =>
    request<Product>(`/products/${id}/stock`, { method: 'PATCH', body: { delta }, token }),
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

type SalesFilters = {
  from?: string;
  to?: string;
  productId?: string;
  staff?: string;
  paymentType?: string;
};

export const salesApi = {
  list: (token: string, filters: SalesFilters = {}): Promise<Sale[]> => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.productId) params.set('productId', filters.productId);
    if (filters.staff) params.set('staff', filters.staff);
    if (filters.paymentType) params.set('paymentType', filters.paymentType);
    const qs = params.toString();
    const path = qs ? `/sales?${qs}` : '/sales';
    return request<Sale[]>(path, { token });
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
  }): Promise<Sale> => request<Sale>('/sales', { method: 'POST', body: payload, token }),
  update: (token: string, id: string, payload: {
    paymentType?: string;
    isPaid?: boolean;
  }): Promise<Sale> => request<Sale>(`/sales/${id}`, { method: 'PATCH', body: payload, token }),
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
};

export const expensesApi = {
  list: (token: string, filters: ExpensesFilters = {}): Promise<Expense[]> => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.category) params.set('category', filters.category);
    const qs = params.toString();
    const path = qs ? `/expenses?${qs}` : '/expenses';
    return request<Expense[]>(path, { token });
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

