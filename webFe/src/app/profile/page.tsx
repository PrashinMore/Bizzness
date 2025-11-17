'use client';

import Link from 'next/link';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function ProfilePage() {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Loading your profile…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between rounded-3xl bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm uppercase tracking-widest text-zinc-400">Profile</p>
            <h1 className="text-3xl font-semibold text-zinc-900">{user.name}</h1>
            <p className="mt-2 text-sm text-zinc-500">{user.email}</p>
          </div>
          <Link href="/settings" className="text-sm font-medium text-zinc-900 underline">
            Settings
          </Link>
        </header>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Account details</h2>
          <dl className="mt-4 space-y-3 text-sm text-zinc-600">
            <div className="flex justify-between">
              <dt className="font-medium text-zinc-500">Email</dt>
              <dd className="text-zinc-900">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-zinc-500">Role</dt>
              <dd className="capitalize text-zinc-900">{user.role}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-zinc-500">Created</dt>
              <dd className="text-zinc-900">
                {new Date(user.createdAt).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-zinc-500">Last updated</dt>
              <dd className="text-zinc-900">
                {new Date(user.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </main>
  );
}


