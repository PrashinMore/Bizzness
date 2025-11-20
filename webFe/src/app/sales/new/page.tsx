'use client';

import { useAuth } from '@/contexts/auth-context';
import { productsApi, salesApi } from '@/lib/api-client';
import type { Product } from '@/types/product';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type DraftItem = {
  productId: string;
  quantity: number;
  sellingPrice: number;
};

export default function NewSalePage() {
  const { token, user } = useAuth();
  const router = useRouter();

  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<DraftItem[]>([{ productId: '', quantity: 1, sellingPrice: 0 }]);
  const [paymentType, setPaymentType] = useState<string>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const prods = await productsApi.list(token);
        setProducts(prods);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [token]);

  const totalAmount = useMemo(
    () =>
      items.reduce((sum, it) => sum + (Number(it.sellingPrice) || 0) * (Number(it.quantity) || 0), 0),
    [items],
  );

  function updateItem(idx: number, patch: Partial<DraftItem>) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: '', quantity: 1, sellingPrice: 0 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSelectProduct(idx: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateItem(idx, {
      productId,
      sellingPrice: product ? Number(product.sellingPrice) : 0,
    });
  }

  async function submit() {
    if (!token || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        date: new Date(date).toISOString(),
        items: items
          .filter((it) => it.productId && it.quantity > 0)
          .map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity),
            sellingPrice: Number(it.sellingPrice),
          })),
        totalAmount: Number(totalAmount.toFixed(2)),
        soldBy: user.id,
        paymentType: paymentType,
      };
      const created = await salesApi.create(token, payload);
      router.push(`/sales/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sale');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Sale</h1>
        <Link href="/sales" className="text-zinc-900 underline">
          Back to Sales
        </Link>
      </header>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <section className="space-y-4 rounded border border-zinc-200 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">Date & Time</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
              <option value="cash">Cash</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50"
            >
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 gap-3 rounded border border-zinc-200 p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-6">
                  <label className="mb-1 block text-sm text-zinc-600">Product</label>
                  <select
                    value={it.productId}
                    onChange={(e) => onSelectProduct(idx, e.target.value)}
                    className="w-full rounded border border-zinc-300 px-3 py-2"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{Number(p.sellingPrice).toFixed(2)}) — stock {p.stock}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm text-zinc-600">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    className="w-full rounded border border-zinc-300 px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-sm text-zinc-600">Selling Price</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.sellingPrice}
                    onChange={(e) => updateItem(idx, { sellingPrice: Number(e.target.value) })}
                    className="w-full rounded border border-zinc-300 px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
                  >
                    X
                  </button>
                </div>
                <div className="sm:col-span-12 text-right text-sm text-zinc-600">
                  Subtotal: ₹ {Number((it.quantity * it.sellingPrice) || 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
            <div className="text-sm text-zinc-600">Sold by: {user?.name ?? user?.id}</div>
            <div className="text-lg font-semibold">
              Total: ₹ {Number(totalAmount).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Sale'}
          </button>
        </div>
      </section>
    </main>
  );
}


