'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function DashboardPage() {
  const { user, loading } = useRequireAuth();
  const { logout } = useAuth();
  const router = useRouter();

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Loading your workspace…</p>
      </main>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col justify-between gap-4 rounded-3xl bg-white p-8 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-widest text-zinc-400">
              Dashboard
            </p>
            <h1 className="text-3xl font-semibold text-zinc-900">
              Welcome, {user.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              You are signed in as <span className="font-medium">{user.role}</span>.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start rounded-full border border-zinc-200 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
          >
            Sign out
          </button>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Quick Links</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-600">
              <li>
                <Link
                  href="/dashboard/settings"
                  className="font-medium text-zinc-900 underline-offset-4 hover:underline"
                >
                  Update your password
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/settings"
                  className="font-medium text-zinc-900 underline-offset-4 hover:underline"
                >
                  Refresh profile information
                </Link>
              </li>
              {user.role === 'admin' ? (
                <li>
                  <Link
                    href="/dashboard/users"
                    className="font-medium text-zinc-900 underline-offset-4 hover:underline"
                  >
                    Manage team members
                  </Link>
                </li>
              ) : null}
            </ul>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Account details
            </h2>
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
        </section>
      </div>
    </main>
  );
}

