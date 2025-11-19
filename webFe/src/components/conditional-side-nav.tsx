'use client';

import { useAuth } from '@/contexts/auth-context';
import { SideNav } from './side-nav';

export function ConditionalSideNav() {
  const { user, loading } = useAuth();

  // Don't show side nav if not logged in or still loading
  if (loading || !user) {
    return null;
  }

  return <SideNav />;
}

