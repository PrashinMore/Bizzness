'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useMemo, useState } from 'react';
import { expensesApi } from '@/lib/api-client';
import type { Expense } from '@/types/expense';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeaderCell } from '@/components/ui/table';
import { SelectInput, TextInput } from '@/components/ui/input';
import { InlineAlert, EmptyState, LoadingState } from '@/components/ui/states';
import { PageHeader, PageShell } from '@/components/ui/shell';

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
    <PageShell className="py-8">
      <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Expenses</h1>
          <p className="mt-1 text-sm text-zinc-600">Monitor operational spending and keep profitability visible.</p>
        </div>
        <Link href="/expenses/new" className="inline-flex">
          <Button>Add Expense</Button>
        </Link>
      </PageHeader>

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">From</label>
            <TextInput
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">To</label>
            <TextInput
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">Category</label>
            <TextInput
              type="text"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              placeholder="rent, salary, utilities"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={load}>Apply</Button>
          <Button
            onClick={() => {
              setFrom('');
              setTo('');
              setCategory('');
              setPage(1);
            }}
            variant="secondary"
          >
            Reset
          </Button>
        </div>
      </Card>

      {error && (
        <InlineAlert>
          {error}
        </InlineAlert>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>Monthly Summary</CardTitle>
          <div className="mt-4 overflow-x-auto">
            <DataTable className="divide-y divide-zinc-200">
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>Month</DataTableHeaderCell>
                  <DataTableHeaderCell>Total</DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {monthly.map((m) => (
                  <tr key={m.month}>
                    <DataTableCell>{m.month}</DataTableCell>
                    <DataTableCell>₹ {Number(m.total).toFixed(2)}</DataTableCell>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
            {!loading && monthly.length === 0 && (
              <EmptyState title="No summary yet" description="Add expenses to see monthly trends." />
            )}
          </div>
        </Card>

        <Card className="hidden md:block">
          <CardTitle>All Expenses</CardTitle>
          <div className="mt-4 overflow-x-auto">
            <DataTable className="divide-y divide-zinc-200">
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>Date</DataTableHeaderCell>
                  <DataTableHeaderCell>Category</DataTableHeaderCell>
                  <DataTableHeaderCell>Amount</DataTableHeaderCell>
                  <DataTableHeaderCell>Note</DataTableHeaderCell>
                  <DataTableHeaderCell />
                </tr>
              </DataTableHead>
              <DataTableBody>
                {(loading ? [] : expenses).map((e) => (
                  <tr key={e.id}>
                    <DataTableCell>{new Date(e.date).toLocaleString()}</DataTableCell>
                    <DataTableCell>{e.category}</DataTableCell>
                    <DataTableCell>₹ {Number(e.amount).toFixed(2)}</DataTableCell>
                    <DataTableCell>{e.note || '-'}</DataTableCell>
                    <DataTableCell>
                      <Link className="text-brand-700 underline" href={`/expenses/${e.id}`}>
                        Edit
                      </Link>
                    </DataTableCell>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <DataTableCell colSpan={5}><LoadingState className="py-6" /></DataTableCell>
                  </tr>
                )}
              </DataTableBody>
            </DataTable>
            {!loading && expenses.length === 0 && (
              <EmptyState title="No expenses found" description="Try changing filters or add your first expense." />
            )}
          </div>
        </Card>
      </section>

      <div className="grid gap-3 md:hidden">
        <Card>
          <CardTitle>All Expenses</CardTitle>
          <div className="mt-4 space-y-3">
            {(loading ? [] : expenses).map((e) => (
              <div key={e.id} className="rounded-xl border border-zinc-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900">₹{Number(e.amount).toFixed(2)}</p>
                  <p className="text-xs text-zinc-500">{new Date(e.date).toLocaleDateString()}</p>
                </div>
                <p className="mt-1 text-sm text-zinc-700">{e.category}</p>
                <p className="mt-1 text-xs text-zinc-600">{e.note || 'No notes'}</p>
                <Link className="mt-2 inline-block text-sm font-medium text-brand-700 underline" href={`/expenses/${e.id}`}>
                  Edit
                </Link>
              </div>
            ))}
            {loading && <LoadingState />}
            {!loading && expenses.length === 0 && <EmptyState title="No expenses found" />}
          </div>
        </Card>
      </div>

      {Math.ceil(total / size) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            variant="secondary"
          >
            Previous
          </Button>
          <span className="text-sm text-zinc-600">
            Page {page} of {Math.ceil(total / size)}
          </span>
          <Button
            onClick={() => setPage((p) => Math.min(Math.ceil(total / size), p + 1))}
            disabled={page >= Math.ceil(total / size)}
            variant="secondary"
          >
            Next
          </Button>
        </div>
      )}
      </div>
    </PageShell>
  );
}


