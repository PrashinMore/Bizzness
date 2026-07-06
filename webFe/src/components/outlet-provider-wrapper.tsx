'use client';

import { OutletProvider } from '@/contexts/outlet-context';
import { useAuth } from '@/contexts/auth-context';

export function OutletProviderWrapper({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  return <OutletProvider token={token} user={user}>{children}</OutletProvider>;
}

