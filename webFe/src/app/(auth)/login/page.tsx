'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { userHasOrganization } from '@/types/user';
import { AuthShell, AuthSubmitButton, AuthFooterLink } from '@/components/auth-shell';
import { FieldInput } from '@/components/ui/form-field';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading, error, refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      if (userHasOrganization(user)) {
        router.replace('/dashboard');
      } else {
        router.replace('/dashboard/organizations');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    try {
      await login(email, password);
      await refreshProfile();
    } catch (err) {
      if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError("Couldn't sign in — check your email and password, then try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError ?? error;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in with your email and password to access your shop dashboard."
      error={displayError}
      footer={
        <>
          Don&apos;t have an account? <AuthFooterLink href="/signup">Create one</AuthFooterLink>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FieldInput
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <FieldInput
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <AuthSubmitButton loading={submitting} loadingLabel="Signing in…">
          Log In
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
