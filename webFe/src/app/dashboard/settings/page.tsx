'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api-client';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { user, loading } = useRequireAuth();
  const { token, refreshProfile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm text-muted">Preparing settings…</p>
      </main>
    );
  }

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword(token, {
        currentPassword,
        newPassword,
      });
      await refreshProfile();
      setStatus('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Could not update your password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshProfile = async () => {
    setRefreshing(true);
    setStatus(null);
    setError(null);
    try {
      await refreshProfile();
      setStatus('Profile refreshed.');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to refresh profile.');
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="rounded-panel bg-surface p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">Settings</h1>
          <p className="mt-2 text-sm text-muted">
            Keep your credentials up to date and refresh your profile details.
          </p>
        </header>

        <section className="rounded-panel bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">
            Change Password
          </h2>
          <form className="mt-4 space-y-5" onSubmit={handlePasswordReset}>
            <div className="space-y-2">
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-muted"
              >
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-muted"
              >
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-muted"
              >
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>

            {status ? (
              <p className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
                {status}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-md border border-danger/20 bg-danger-muted px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </section>

        <section className="rounded-panel bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">
            Refresh Profile
          </h2>
          <p className="mt-2 text-sm text-muted">
            Pull the latest user information from the server.
          </p>
          <button
            onClick={handleRefreshProfile}
            disabled={refreshing}
            className="mt-4 rounded-full border border-border px-5 py-2 text-sm font-semibold uppercase tracking-wide text-muted transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-70"
          >
            {refreshing ? 'Refreshing…' : 'Refresh now'}
          </button>
        </section>
      </div>
    </main>
  );
}

