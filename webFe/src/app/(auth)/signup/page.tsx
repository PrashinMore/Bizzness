'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { userHasOrganization } from '@/types/user';
import { AuthShell, AuthSubmitButton, AuthFooterLink } from '@/components/auth-shell';
import { FieldInput } from '@/components/ui/form-field';

export default function SignupPage() {
  const router = useRouter();
  const { signup, user, loading, error, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      const hasOrganizations = userHasOrganization(user);
      if (hasOrganizations) {
        router.replace('/dashboard');
      } else {
        router.replace('/dashboard/organizations');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setLocalError(null);

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
      await refreshProfile();
    } catch (err) {
      if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError("Couldn't create your account — check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError ?? error;

  return (
    <AuthShell
      title="Create your account"
      subtitle="The first account you create becomes the shop admin automatically."
      error={displayError}
      footer={
        <>
          Already have an account? <AuthFooterLink href="/login">Log in</AuthFooterLink>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FieldInput
          label="Full name"
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
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
          autoComplete="new-password"
          required
          value={password}
          error={passwordError}
          hint="Use at least 8 characters to keep your account secure."
          onChange={(event) => setPassword(event.target.value)}
        />
        <AuthSubmitButton loading={submitting} loadingLabel="Creating account…">
          Create Account
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
