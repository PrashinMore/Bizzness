'use client';

import { useAuth } from '@/contexts/auth-context';
import { salesApi } from '@/lib/api-client';
import type { Sale } from '@/types/sale';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SaleDetailPage() {
  const { token } = useAuth();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const validId = typeof id === 'string' && id !== 'undefined' ? id : null;
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token || !validId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await salesApi.get(token, validId);
        setSale(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sale');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, validId]);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sale Details</h1>
        <Link href="/sales" className="text-zinc-900 underline">
          Back to Sales
        </Link>
      </header>

      {loading && <div>Loading...</div>}
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
      {sale && (
        <section className="space-y-4 rounded border border-zinc-200 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-sm text-zinc-500">Sale ID</div>
              <div className="font-mono text-sm">{sale.id}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-500">Date</div>
              <div>{new Date(sale.date).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-500">Sold By</div>
              <div>{sale.soldBy}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-500">Total Amount</div>
              <div>₹ {Number(sale.totalAmount).toFixed(2)}</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                    Product ID
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                    Qty
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                    Price
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {sale.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-2 text-sm font-mono">{it.productId}</td>
                    <td className="px-4 py-2 text-sm">{it.quantity}</td>
                    <td className="px-4 py-2 text-sm">₹ {Number(it.sellingPrice).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm">₹ {Number(it.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}


