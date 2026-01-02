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
      <main className="min-h-screen bg-zinc-50 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">Customers</h1>
          <p className="mt-2 text-zinc-600">Manage your customer relationships</p>
        </header>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800">{error}</div>
        )}

        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, phone, or email"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Segment</label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
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
                <label className="block text-sm font-medium text-zinc-700">Tag</label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Filter by tag"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Search
            </button>
          </form>
        </div>

        <div className="rounded-lg bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700">
                    Visits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700">
                    Total Spend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700">
                    Avg Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700">
                    Last Visit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">
                        {customer.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                        {customer.phone}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                        {customer.totalVisits}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                        ₹{Number(customer.totalSpend).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                        ₹{Number(customer.avgOrderValue).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                        {customer.lastVisitAt
                          ? new Date(customer.lastVisitAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <Link
                          href={`/crm/customers/${customer.id}`}
                          className="text-zinc-600 hover:text-zinc-900"
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
            <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-700">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} customers
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-zinc-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-zinc-300 px-3 py-1 text-sm disabled:opacity-50"
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

