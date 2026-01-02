'use client';

import { OutletProvider } from '@/contexts/outlet-context';
import { useAuth } from '@/contexts/auth-context';

export function OutletProviderWrapper({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return <OutletProvider token={token}>{children}</OutletProvider>;
}

