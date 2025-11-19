'use client';

import { useAuth } from '@/contexts/auth-context';

export function ConditionalContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  // Only apply padding when user is logged in (side nav is visible)
  const paddingClass = !loading && user ? 'md:pl-56' : '';

  return (
    <div className={`min-h-screen bg-zinc-50 ${paddingClass}`}>
      {children}
    </div>
  );
}

