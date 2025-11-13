'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, usersApi } from '@/lib/api-client';
import { AuthResponse, User } from '@/types/user';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setAuthState: (auth: AuthResponse | null) => void;
};

const STORAGE_KEY = 'bizzness-auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(
    (payload: { user: User | null; token: string | null }) => {
      if (typeof window === 'undefined') {
        return;
      }
      if (payload.user && payload.token) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            user: payload.user,
            accessToken: payload.token,
          }),
        );
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    [],
  );

  const setAuthState = useCallback(
    (auth: AuthResponse | null) => {
      if (auth) {
        setUser(auth.user);
        setToken(auth.accessToken);
        persist({ user: auth.user, token: auth.accessToken });
      } else {
        setUser(null);
        setToken(null);
        persist({ user: null, token: null });
      }
    },
    [persist],
  );

  useEffect(() => {
    async function bootstrap() {
      if (typeof window === 'undefined') {
        return;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const parsed = JSON.parse(stored) as AuthResponse;
        if (parsed?.accessToken) {
          const profile = await usersApi.profile(parsed.accessToken);
          setUser(profile);
          setToken(parsed.accessToken);
        } else {
          persist({ user: null, token: null });
        }
      } catch (err) {
        console.error(err);
        persist({ user: null, token: null });
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [persist]);

  const handleAuthResponse = useCallback(
    async (promise: Promise<AuthResponse>) => {
      setLoading(true);
      setError(null);
      try {
        const response = await promise;
        setAuthState(response);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unable to authenticate');
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAuthState],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      await handleAuthResponse(authApi.login({ email, password }));
    },
    [handleAuthResponse],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      await handleAuthResponse(authApi.signup({ name, email, password }));
    },
    [handleAuthResponse],
  );

  const logout = useCallback(() => {
    setAuthState(null);
    setError(null);
  }, [setAuthState]);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const profile = await usersApi.profile(token);
      setUser(profile);
      persist({ user: profile, token });
    } catch (err) {
      console.error(err);
      logout();
    }
  }, [token, persist, logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      error,
      login,
      signup,
      logout,
      refreshProfile,
      setAuthState,
    }),
    [
      user,
      token,
      loading,
      error,
      login,
      signup,
      logout,
      refreshProfile,
      setAuthState,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

