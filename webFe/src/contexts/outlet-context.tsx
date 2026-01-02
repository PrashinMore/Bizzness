'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { outletsApi } from '@/lib/api-client';
import { Outlet } from '@/types/outlet';

type OutletContextValue = {
  selectedOutlet: Outlet | null;
  outlets: Outlet[];
  loading: boolean;
  setSelectedOutlet: (outlet: Outlet | null) => void;
  refreshOutlets: () => Promise<void>;
};

const STORAGE_KEY = 'selected-outlet-id';

const OutletContext = createContext<OutletContextValue | undefined>(undefined);

export function OutletProvider({ children, token }: { children: ReactNode; token: string | null }) {
  const [selectedOutlet, setSelectedOutletState] = useState<Outlet | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  const setSelectedOutlet = useCallback((outlet: Outlet | null) => {
    setSelectedOutletState(outlet);
    if (typeof window !== 'undefined') {
      if (outlet) {
        localStorage.setItem(STORAGE_KEY, outlet.id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const refreshOutlets = useCallback(async () => {
    if (!token) {
      setOutlets([]);
      setLoading(false);
      return;
    }

    try {
      const data = await outletsApi.list(token);
      setOutlets(data);

      // Auto-select if only one outlet
      if (data.length === 1 && !selectedOutlet) {
        setSelectedOutlet(data[0]);
      } else if (data.length > 0 && selectedOutlet) {
        // Verify selected outlet still exists
        const stillExists = data.find((o) => o.id === selectedOutlet.id);
        if (!stillExists) {
          // Select primary outlet or first one
          const primary = data.find((o) => o.isPrimary) || data[0];
          setSelectedOutlet(primary);
        }
      } else if (data.length > 0 && !selectedOutlet) {
        // Restore from localStorage or select primary
        if (typeof window !== 'undefined') {
          const storedId = localStorage.getItem(STORAGE_KEY);
          if (storedId) {
            const stored = data.find((o) => o.id === storedId);
            if (stored) {
              setSelectedOutlet(stored);
              return;
            }
          }
        }
        // Select primary outlet or first one
        const primary = data.find((o) => o.isPrimary) || data[0];
        setSelectedOutlet(primary);
      }
    } catch (err) {
      console.error('Failed to load outlets:', err);
      setOutlets([]);
    } finally {
      setLoading(false);
    }
  }, [token, selectedOutlet, setSelectedOutlet]);

  useEffect(() => {
    refreshOutlets();
  }, [refreshOutlets]);

  const value: OutletContextValue = {
    selectedOutlet,
    outlets,
    loading,
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

