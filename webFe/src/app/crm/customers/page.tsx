'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { crmApi } from '@/lib/api-client';
import type { Customer } from '@/types/crm';
import Link from 'next/link';

export default function CustomersListPage() {
  const { user, loading } = useRequireAuth();
  const { token } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('');
  const [tag, setTag] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    async function loadCustomers() {
      if (!token) {
        return;
      }
      setFetching(true);
      setError(null);
      try {
        const data = await crmApi.listCustomers(token, {
          search: search || undefined,
          segment: segment || undefined,
          tag: tag || undefined,
          page,
          size: pageSize,
        });
        setCustomers(data.customers);
        setTotal(data.total);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load customers');
        }
      } finally {
        setFetching(false);
      }
    }

    loadCustomers();
  }, [token, search, segment, tag, page, pageSize]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading || fetching) {
    return (
      <main className="min-h-screen bg-paper px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-ink">Customers</h1>
          <p className="mt-2 text-muted">Manage your customer relationships</p>
        </header>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800">{error}</div>
        )}

        <div className="mb-6 rounded-lg bg-surface p-6 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-muted">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, phone, or email"
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted">Segment</label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                >
                  <option value="">All Customers</option>
                  <option value="first-time">First-time Customers</option>
                  <option value="regulars">Regulars (5+ visits)</option>
                  <option value="high-spenders">High Spenders (₹5000+)</option>
                  <option value="inactive-30">Inactive (30+ days)</option>
                  <option value="inactive-60">Inactive (60+ days)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted">Tag</label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Filter by tag"
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-ink px-4 py-2 text-sm text-white hover:bg-ink-light"
            >
              Search
            </button>
          </form>
        </div>

        <div className="rounded-lg bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-paper">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Visits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Total Spend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Avg Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Last Visit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-paper">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-ink">
                        {customer.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                        {customer.phone}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                        {customer.totalVisits}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                        ₹{Number(customer.totalSpend).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                        ₹{Number(customer.avgOrderValue).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                        {customer.lastVisitAt
                          ? new Date(customer.lastVisitAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <Link
                          href={`/crm/customers/${customer.id}`}
                          className="text-muted hover:text-ink"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="border-t border-border bg-paper px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} customers
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

