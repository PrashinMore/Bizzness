'use client';

import { useAuth } from '@/contexts/auth-context';
import { userHasOrganization } from '@/types/user';
import { SideNav } from './side-nav';

export function ConditionalSideNav() {
  const { user, loading } = useAuth();

  // Hide navigation until the user belongs to an organization.
  if (loading || !user || !userHasOrganization(user)) {
    return null;
  }

  return <SideNav />;
}

