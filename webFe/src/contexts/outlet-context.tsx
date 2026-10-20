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
import { outletsApi } from '@/lib/api-client';
import { Outlet } from '@/types/outlet';
import { User, userHasOrganization } from '@/types/user';

type OutletContextValue = {
  selectedOutlet: Outlet | null;
  outlets: Outlet[];
  loading: boolean;
  /** True once outlet list is loaded and a selection is applied (or confirmed empty). */
  isOutletReady: boolean;
  setSelectedOutlet: (outlet: Outlet | null) => void;
  refreshOutlets: () => Promise<void>;
};

export const OUTLET_STORAGE_KEY = 'selected-outlet-id';

const OutletContext = createContext<OutletContextValue | undefined>(undefined);

function readStoredOutletId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(OUTLET_STORAGE_KEY);
}

/**
 * Pick which outlet should be active:
 * 1. Last-session outlet from localStorage (if still in the list)
 * 2. Primary outlet
 * 3. First outlet (covers single-outlet orgs)
 */
function resolveOutletSelection(data: Outlet[]): Outlet | null {
  if (data.length === 0) return null;

  const storedId = readStoredOutletId();
  if (storedId) {
    const stored = data.find((o) => o.id === storedId);
    if (stored) return stored;
  }

  return data.find((o) => o.isPrimary) || data[0];
}

export function OutletProvider({
  children,
  token,
  user,
}: {
  children: ReactNode;
  token: string | null;
  user: User | null;
}) {
  const [selectedOutlet, setSelectedOutletState] = useState<Outlet | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  const setSelectedOutlet = useCallback((outlet: Outlet | null) => {
    setSelectedOutletState(outlet);
    if (typeof window === 'undefined') return;
    // Persist across sessions so the last choice is restored on next login.
    // Do not clear storage on logout — only when selection is explicitly cleared
    // with no replacement, or when the stored id is no longer valid.
    if (outlet) {
      localStorage.setItem(OUTLET_STORAGE_KEY, outlet.id);
    }
  }, []);

  const refreshOutlets = useCallback(async () => {
    if (!token || !userHasOrganization(user)) {
      setOutlets([]);
      setSelectedOutletState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await outletsApi.list(token);
      setOutlets(data);

      const next = resolveOutletSelection(data);
      setSelectedOutletState(next);
      if (typeof window !== 'undefined') {
        if (next) {
          localStorage.setItem(OUTLET_STORAGE_KEY, next.id);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (!message.includes('assigned to at least one organization')) {
        console.error('Failed to load outlets:', err);
      }
      setOutlets([]);
      setSelectedOutletState(null);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    void refreshOutlets();
  }, [refreshOutlets]);

  const isOutletReady = useMemo(() => {
    if (loading) return false;
    if (!token || !userHasOrganization(user)) return true;
    // Ready when we have a selected outlet, or confirmed there are none.
    return outlets.length === 0 || selectedOutlet !== null;
  }, [loading, token, user, outlets.length, selectedOutlet]);

  const value: OutletContextValue = {
    selectedOutlet,
    outlets,
    loading,
    isOutletReady,
    setSelectedOutlet,
    refreshOutlets,
  };

  return <OutletContext.Provider value={value}>{children}</OutletContext.Provider>;
}

export function useOutlet() {
  const context = useContext(OutletContext);
  if (!context) {
    throw new Error('useOutlet must be used within an OutletProvider');
  }
  return context;
}
