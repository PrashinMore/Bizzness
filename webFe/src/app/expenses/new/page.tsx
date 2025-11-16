'use client';

import { useAuth } from '@/contexts/auth-context';
import { expensesApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export default function NewExpensePage() {
  const { token, user } = useAuth();
  const router = useRouter();

  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      await expensesApi.create(token, {
        category,
        amount: Number(amount),
        note: note || undefined,
        date: new Date(date).toISOString(),
        addedBy: user.id,
      });
      router.push('/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Add Expense</h1>
        <Link href="/expenses" className="text-zinc-900 underline">
          Back to Expenses
        </Link>
      </header>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded border border-zinc-200 bg-white p-6">
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

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
          <Link
            href="/expenses"
            className="rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}


