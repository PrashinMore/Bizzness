'use client';

import { useAuth } from '@/contexts/auth-context';
import { expensesApi } from '@/lib/api-client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Expense } from '@/types/expense';

export default function EditExpensePage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expense, setExpense] = useState<Expense | null>(null);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    async function load() {
      if (!token || !id) return;
      setLoading(true);
      setError(null);
      try {
        // No GET single endpoint in API client; reuse list and find in client
        const list = await expensesApi.list(token, {});
        const found = list.find((e) => e.id === id) || null;
        if (!found) throw new Error('Expense not found');
        setExpense(found);
        setCategory(found.category);
        setAmount(String(found.amount));
        setDate(new Date(found.date).toISOString().slice(0, 16));
        setNote(found.note || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load expense');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      await expensesApi.update(token, id, {
        category,
        amount: Number(amount),
        date: new Date(date).toISOString(),
        note: note || undefined,
        addedBy: expense?.addedBy || '',
      });
      router.push('/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!token || !id) return;
    if (!confirm('Delete this expense?')) return;
    setLoading(true);
    setError(null);
    try {
      await expensesApi.remove(token, id);
      router.push('/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Expense</h1>
        <Link href="/expenses" className="text-zinc-900 underline">
          Back to Expenses
        </Link>
      </header>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 rounded border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">Date</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm text-zinc-600">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="rounded border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </form>
    </main>
  );
}


