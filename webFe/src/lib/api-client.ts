import { AuthResponse, User } from '@/types/user';
import { Product } from '@/types/product';
import { Sale } from '@/types/sale';
import { Expense } from '@/types/expense';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

async function request<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
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
    const qs = params.toString();
    const path = qs ? `/products?${qs}` : '/products';
    return request<Product[]>(path, { token });
  },
  create: (token: string, payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isLowStock'>): Promise<Product> =>
    request<Product>('/products', { method: 'POST', body: payload, token }),
  update: (
    token: string,
    id: string,
    payload: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isLowStock'>>,
  ): Promise<Product> =>
    request<Product>(`/products/${id}`, { method: 'PATCH', body: payload, token }),
  adjustStock: (token: string, id: string, delta: number): Promise<Product> =>
    request<Product>(`/products/${id}/stock`, { method: 'PATCH', body: { delta }, token }),
  remove: (token: string, id: string): Promise<void> =>
    request<void>(`/products/${id}`, { method: 'DELETE', token }),
};

type SalesFilters = {
  from?: string;
  to?: string;
  productId?: string;
  staff?: string;
};

export const salesApi = {
  list: (token: string, filters: SalesFilters = {}): Promise<Sale[]> => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.productId) params.set('productId', filters.productId);
    if (filters.staff) params.set('staff', filters.staff);
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
  }): Promise<Sale> => request<Sale>('/sales', { method: 'POST', body: payload, token }),
  dailyTotals: (token: string, from?: string, to?: string): Promise<{ day: string; total: string }[]> => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    const path = qs ? `/sales/totals/daily?${qs}` : '/sales/totals/daily';
    return request(path, { token });
  }
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

