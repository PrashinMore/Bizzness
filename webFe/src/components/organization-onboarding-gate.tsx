'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { userHasOrganization } from '@/types/user';

const ONBOARDING_PATH = '/dashboard/organizations';

export function OrganizationOnboardingGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const needsOnboarding = Boolean(
    user && !userHasOrganization(user) && user.role === 'admin',
  );
  const isOnboardingPage = pathname === ONBOARDING_PATH;

  useEffect(() => {
    if (loading || !needsOnboarding) {
      return;
    }

    if (!isOnboardingPage) {
      router.replace(ONBOARDING_PATH);
    }
  }, [loading, needsOnboarding, isOnboardingPage, router]);

  if (loading || !user) {
    return <>{children}</>;
  }

  if (!needsOnboarding) {
    return <>{children}</>;
  }

  if (!isOnboardingPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-600">Redirecting to organization setup…</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[200] bg-zinc-900/60 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed inset-0 z-[201]">
        {children}
      </div>
    </>
  );
}
