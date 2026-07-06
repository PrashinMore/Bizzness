'use client';

import Link from 'next/link';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function ProfilePage() {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm text-muted">Loading your profile…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between rounded-panel bg-surface p-6 shadow-sm">
          <div>
            <p className="text-sm uppercase tracking-widest text-muted">Profile</p>
            <h1 className="text-3xl font-semibold text-ink">{user.name}</h1>
            <p className="mt-2 text-sm text-muted">{user.email}</p>
          </div>
          <Link href="/settings" className="text-sm font-medium text-ink underline">
            Settings
          </Link>
        </header>

        <article className="rounded-panel bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Account details</h2>
          <dl className="mt-4 space-y-3 text-sm text-muted">
            <div className="flex justify-between">
              <dt className="font-medium text-muted">Email</dt>
              <dd className="text-ink">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-muted">Role</dt>
              <dd className="capitalize text-ink">{user.role}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-muted">Created</dt>
              <dd className="text-ink">
                {new Date(user.createdAt).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-muted">Last updated</dt>
              <dd className="text-ink">
                {new Date(user.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-panel bg-surface p-6 shadow-sm border-l-4 border-red-500">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
          <p className="text-sm text-muted mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Link
            href="/profile/delete-account"
            className="inline-block px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Delete Account
          </Link>
        </article>
      </div>
    </main>
  );
}


