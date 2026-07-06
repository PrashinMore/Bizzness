'use client';

import { useAuth } from '@/contexts/auth-context';
import { userHasOrganization } from '@/types/user';

export function ConditionalContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  const paddingClass =
    !loading && user && userHasOrganization(user) ? 'md:pl-64 pb-20 md:pb-0' : '';

  return <div className={`min-h-screen bg-paper ${paddingClass}`}>{children}</div>;
}
