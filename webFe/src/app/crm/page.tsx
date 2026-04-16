'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { crmApi, settingsApi } from '@/lib/api-client';
import type { CrmDashboardStats } from '@/types/crm';
import type { Settings } from '@/lib/api-client';
import Link from 'next/link';
import { PageHeader, PageShell } from '@/components/ui/shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InlineAlert, LoadingState } from '@/components/ui/states';

export default function CrmDashboardPage() {
  const { loading } = useRequireAuth();
  const { token } = useAuth();

  const [stats, setStats] = useState<CrmDashboardStats | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
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
        const [statsData, settingsData] = await Promise.all([
          crmApi.getDashboard(token),
          settingsApi.get(token).catch(() => null),
        ]);
        setStats(statsData);
        setSettings(settingsData);
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
      <PageShell className="py-8">
        <div className="mx-auto max-w-7xl">
          <LoadingState message="Loading CRM dashboard..." />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell className="py-8">
        <div className="mx-auto max-w-7xl">
          <InlineAlert>{error}</InlineAlert>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="py-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <PageHeader className="mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">CRM</p>
            <h1 className="mt-1 text-3xl font-bold text-zinc-900">CRM Dashboard</h1>
            <p className="mt-2 text-zinc-600">Customer relationship management overview</p>
          </div>
        </PageHeader>

        {stats && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <div className="text-sm font-medium text-zinc-600">Total Customers</div>
              <div className="mt-2 text-3xl font-bold text-zinc-900">{stats.totalCustomers}</div>
            </Card>

            <Card>
              <div className="text-sm font-medium text-zinc-600">New Customers (7 days)</div>
              <div className="mt-2 text-3xl font-bold text-zinc-900">{stats.newCustomersLast7Days}</div>
            </Card>

            <Card>
              <div className="text-sm font-medium text-zinc-600">Repeat Rate</div>
              <div className="mt-2 text-3xl font-bold text-zinc-900">{stats.repeatRate}%</div>
            </Card>

            <Card>
              <div className="text-sm font-medium text-zinc-600">Avg Visits/Customer</div>
              <div className="mt-2 text-3xl font-bold text-zinc-900">{stats.avgVisitsPerCustomer.toFixed(1)}</div>
            </Card>
          </div>
        )}

        <div className="mt-8 flex gap-4">
          <Link href="/crm/customers"><Button>View All Customers</Button></Link>
          {settings?.enableLoyalty && (
            <Link href="/crm/rewards"><Button variant="secondary">Manage Rewards</Button></Link>
          )}
        </div>
      </div>
    </PageShell>
  );
}

