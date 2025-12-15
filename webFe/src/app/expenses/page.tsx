'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useMemo, useState } from 'react';
import { expensesApi } from '@/lib/api-client';
import type { Expense } from '@/types/expense';

export default function ExpensesListPage() {
  const { token } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [monthly, setMonthly] = useState<{ month: string; total: string }[]>([]);

  const load = useMemo(
    () => async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [listResult, summary] = await Promise.all([
          expensesApi.list(token, {
            from: from || undefined,
            to: to || undefined,
            category: category || undefined,
            page,
            size,
          }),
          expensesApi.monthlySummary(token, from || undefined, to || undefined),
        ]);
        setExpenses(listResult.expenses);
        setTotal(listResult.total);
        setMonthly(summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load expenses');
      } finally {
        setLoading(false);
      }
    },
    [token, from, to, category, page, size],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <Link
          href="/expenses/new"
          className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700"
        >
          Add Expense
        </Link>
      </header>

      <section className="rounded border border-zinc-200 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
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
            <label className="text-sm text-zinc-600">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              placeholder="rent, salary, utilities"
              className="rounded border border-zinc-300 px-3 py-2"
            />
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
              setCategory('');
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

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Monthly Summary</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">Month</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {monthly.map((m) => (
                  <tr key={m.month}>
                    <td className="px-4 py-2 text-sm">{m.month}</td>
                    <td className="px-4 py-2 text-sm">₹ {Number(m.total).toFixed(2)}</td>
                  </tr>
                ))}
                {!loading && monthly.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-zinc-700" colSpan={2}>
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">All Expenses</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">Category</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">Amount</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">Note</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {(loading ? [] : expenses).map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2 text-sm">{new Date(e.date).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm">{e.category}</td>
                    <td className="px-4 py-2 text-sm">₹ {Number(e.amount).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm">{e.note || '-'}</td>
                    <td className="px-4 py-2 text-sm">
                      <Link className="text-zinc-900 underline" href={`/expenses/${e.id}`}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-zinc-700" colSpan={5}>
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && expenses.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-zinc-700" colSpan={5}>
                      No expenses found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {Math.ceil(total / size) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-600">
            Page {page} of {Math.ceil(total / size)}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(Math.ceil(total / size), p + 1))}
            disabled={page >= Math.ceil(total / size)}
            className="rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}


