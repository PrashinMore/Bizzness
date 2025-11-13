import { AuthResponse, User } from '@/types/user';

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

