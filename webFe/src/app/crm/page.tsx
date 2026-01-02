'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { crmApi } from '@/lib/api-client';
import type { CrmDashboardStats, Customer } from '@/types/crm';
import Link from 'next/link';

export default function CrmDashboardPage() {
  const { user, loading } = useRequireAuth();
  const { token } = useAuth();

  const [stats, setStats] = useState<CrmDashboardStats | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!token) {
        return;
      }
      setFetching(true);
      setError(null);
      try {
        const data = await crmApi.getDashboard(token);
        setStats(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load CRM dashboard');
        }
      } finally {
        setFetching(false);
      }
    }

    loadStats();
  }, [token]);

  if (loading || fetching) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg bg-red-50 p-4 text-red-800">{error}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">CRM Dashboard</h1>
          <p className="mt-2 text-zinc-600">Customer relationship management overview</p>
        </header>

        {stats && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-zinc-600">Total Customers</div>
              <div className="mt-2 text-3xl font-bold text-zinc-900">{stats.totalCustomers}</div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-zinc-600">New Customers (7 days)</div>
              <div className="mt-2 text-3xl font-bold text-zinc-900">{stats.newCustomersLast7Days}</div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-zinc-600">Repeat Rate</div>
              <div className="mt-2 text-3xl font-bold text-zinc-900">{stats.repeatRate}%</div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-zinc-600">Avg Visits/Customer</div>
              <div className="mt-2 text-3xl font-bold text-zinc-900">{stats.avgVisitsPerCustomer.toFixed(1)}</div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/crm/customers"
            className="inline-block rounded-lg bg-zinc-900 px-6 py-3 text-white hover:bg-zinc-800"
          >
            View All Customers
          </Link>
        </div>
      </div>
    </main>
  );
}

