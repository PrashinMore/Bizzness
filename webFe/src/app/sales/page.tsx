'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useMemo, useState } from 'react';
import { productsApi, salesApi, usersApi } from '@/lib/api-client';
import type { Sale } from '@/types/sale';
import type { Product } from '@/types/product';
import type { User } from '@/types/user';

export default function SalesListPage() {
  const { token } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [staff, setStaff] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const userMap = useMemo(() => {
    return new Map(users.map((u) => [u.id, u]));
  }, [users]);

  useEffect(() => {
    async function bootstrap() {
      if (!token) return;
      try {
        const [prods, usersData] = await Promise.all([
          productsApi.list(token),
          usersApi.list(token),
        ]);
        setProducts(prods);
        setUsers(usersData);
      } catch (err) {
        console.error(err);
      }
    }
    bootstrap();
  }, [token]);

  const load = useMemo(
    () => async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const list = await salesApi.list(token, {
          from: from || undefined,
          to: to || undefined,
          productId: productId || undefined,
          staff: staff || undefined,
          paymentType: paymentType || undefined,
        });
        setSales(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sales');
      } finally {
        setLoading(false);
      }
    },
    [token, from, to, productId, staff, paymentType],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sales</h1>
        <Link
          href="/sales/new"
          className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700"
        >
          New Sale
        </Link>
      </header>

      <section className="rounded border border-zinc-200 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">Product</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
            >
              <option value="">All</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">Staff</label>
            <input
              type="text"
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
              placeholder="Name or ID"
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">Payment Type</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
            >
              <option value="">All</option>
              <option value="cash">Cash</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={load}
            className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setFrom('');
              setTo('');
              setProductId('');
              setStaff('');
              setPaymentType('');
            }}
            className="rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-50"
          >
            Reset
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-x-auto rounded border border-zinc-200">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                Date
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                Items
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                Total
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                Payment Type
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                Sold By
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {(loading ? [] : sales).map((s) => (
              <tr key={s.id || Math.random().toString(36)}>
                <td className="px-4 py-2 text-sm">
                  {new Date(s.date).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-sm">
                  {s.items.reduce((sum, it) => sum + it.quantity, 0)} items
                </td>
                <td className="px-4 py-2 text-sm">₹ {Number(s.totalAmount).toFixed(2)}</td>
                <td className="px-4 py-2 text-sm">
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-zinc-100 text-zinc-800">
                    {s.paymentType || 'cash'}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm">{userMap.get(s.soldBy)?.name || s.soldBy}</td>
                <td className="px-4 py-2 text-sm">
                  {s.id ? (
                    <Link
                      className="text-zinc-900 underline"
                      href={`/sales/${s.id}`}
                    >
                      View
                    </Link>
                  ) : (
                    <span className="text-zinc-400">No ID</span>
                  )}
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-zinc-500" colSpan={6}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && sales.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-zinc-500" colSpan={6}>
                  No sales found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}


