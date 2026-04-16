'use client';

import { useAuth } from '@/contexts/auth-context';

export function ConditionalContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  // Only apply padding when user is logged in (side nav is visible)
  const paddingClass = !loading && user ? 'md:pl-64 pb-20 md:pb-0' : '';

  return (
    <div className={`min-h-screen bg-app ${paddingClass}`}>
      {children}
    </div>
  );
}

