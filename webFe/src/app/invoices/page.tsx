'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useMemo, useState } from 'react';
import { invoicesApi } from '@/lib/api-client';
import type { Invoice } from '@/types/invoice';

export default function InvoicesListPage() {
  const { token, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [customer, setCustomer] = useState<string>('');
  const [page, setPage] = useState(1);
  const [size] = useState(20);

  const organizationId = useMemo(() => {
    return user?.organizations?.[0]?.id || '';
  }, [user]);

  const load = useMemo(
    () => async () => {
      if (!token || !organizationId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await invoicesApi.list(token, organizationId, {
          from: from || undefined,
          to: to || undefined,
          customer: customer || undefined,
          page,
          size,
        });
        setInvoices(result.invoices);
        setTotal(result.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoices');
      } finally {
        setLoading(false);
      }
    },
    [token, organizationId, from, to, customer, page, size],
  );

  useEffect(() => {
    load();
  }, [load]);

  const formatCurrency = (amount: number) => {
    return `₹ ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalPages = Math.ceil(total / size);

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoices</h1>
      </header>

      <section className="rounded border border-zinc-200 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">Customer</label>
            <input
              type="text"
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value);
                setPage(1);
              }}
              placeholder="Customer name"
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              setFrom('');
              setTo('');
              setCustomer('');
              setPage(1);
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
                Invoice Number
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                Date
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                Customer
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                Items
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                Total
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                Status
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {(loading ? [] : invoices).map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-4 py-2 text-sm font-mono">{invoice.invoiceNumber}</td>
                <td className="px-4 py-2 text-sm">{formatDate(invoice.createdAt)}</td>
                <td className="px-4 py-2 text-sm">
                  {invoice.customerName || <span className="text-zinc-400">—</span>}
                </td>
                <td className="px-4 py-2 text-sm">
                  {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}
                </td>
                <td className="px-4 py-2 text-sm font-medium">
                  {formatCurrency(parseFloat(invoice.total.toString()))}
                </td>
                <td className="px-4 py-2 text-sm">
                  {invoice.pdfUrl ? (
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800">
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800">
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm">
                  {invoice.pdfUrl ? (
                    <button
                      onClick={async () => {
                        if (!token || !organizationId) return;
                        try {
                          const pdfUrl = invoicesApi.getPdfUrl(token, organizationId, invoice.id);
                          const response = await fetch(pdfUrl, {
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                            credentials: 'include',
                          });
                          
                          if (!response.ok) {
                            throw new Error('Failed to load PDF');
                          }
                          
                          const blob = await response.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          window.open(blobUrl, '_blank');
                        } catch (err) {
                          // Fallback to invoice page if PDF fails
                          window.location.href = `/invoices/${invoice.id}`;
                        }
                      }}
                      className="text-blue-600 underline hover:text-blue-700 cursor-pointer"
                    >
                      View PDF
                    </button>
                  ) : (
                    <Link
                      className="text-zinc-900 underline hover:text-zinc-700"
                      href={`/invoices/${invoice.id}`}
                    >
                      View
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-zinc-700" colSpan={7}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && invoices.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-zinc-700" colSpan={7}>
                  No invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}

