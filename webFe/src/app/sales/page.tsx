'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useMemo, useState } from 'react';
import { productsApi, salesApi, usersApi } from '@/lib/api-client';
import type { Sale } from '@/types/sale';
import type { Product } from '@/types/product';
import type { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextInput, SelectInput } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeaderCell } from '@/components/ui/table';
import { PageHeader, PageShell } from '@/components/ui/shell';

export default function SalesListPage() {
  const { token } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [paymentTotals, setPaymentTotals] = useState<{
    cash: number;
    UPI: number;
    total: number;
  } | null>(null);

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [staff, setStaff] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [size] = useState(20);
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
        const [listResult, totals] = await Promise.all([
          salesApi.list(token, {
            from: from || undefined,
            to: to || undefined,
            productId: productId || undefined,
            staff: staff || undefined,
            paymentType: paymentType || undefined,
            page,
            size,
          }),
          salesApi.getPaymentTypeTotals(token, {
            from: from || undefined,
            to: to || undefined,
            productId: productId || undefined,
            staff: staff || undefined,
            // paymentType is intentionally excluded to get totals for both
          }),
        ]);
        setSales(listResult.sales);
        setTotal(listResult.total);
        setPaymentTotals(totals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sales');
      } finally {
        setLoading(false);
      }
    },
    [token, from, to, productId, staff, paymentType, page, size],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageShell className="py-8">
      <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Sales</h1>
          <p className="mt-1 text-sm text-zinc-600">Track transactions, payment mix, and staff performance.</p>
        </div>
        <div className="flex gap-2">
        <Link
          href="/invoices"
          className="inline-flex"
        >
          <Button variant="secondary">Invoices</Button>
        </Link>
        <Link
          href="/sales/new"
          className="inline-flex"
        >
          <Button>New Sale</Button>
        </Link>
          </div>
      </PageHeader>

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
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
            <label className="text-sm text-zinc-600">Product</label>
            <SelectInput
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">Staff</label>
            <TextInput
              type="text"
              value={staff}
              onChange={(e) => {
                setStaff(e.target.value);
                setPage(1);
              }}
              placeholder="Name or ID"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600">Payment Type</label>
            <SelectInput
              value={paymentType}
              onChange={(e) => {
                setPaymentType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="cash">Cash</option>
              <option value="UPI">UPI</option>
            </SelectInput>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={load}>
            Apply
          </Button>
          <Button
            onClick={() => {
              setFrom('');
              setTo('');
              setProductId('');
              setStaff('');
              setPaymentType('');
              setPage(1);
            }}
            variant="secondary"
          >
            Reset
          </Button>
        </div>
      </Card>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {/* Payment Type Totals */}
      {paymentTotals && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <div className="text-sm uppercase tracking-widest text-zinc-700">
              Cash Payments
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-900">
              ₹{paymentTotals.cash.toFixed(2)}
            </div>
          </Card>
          <Card>
            <div className="text-sm uppercase tracking-widest text-zinc-700">
              UPI Payments
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-900">
              ₹{paymentTotals.UPI.toFixed(2)}
            </div>
          </Card>
          <Card>
            <div className="text-sm uppercase tracking-widest text-zinc-700">
              Total
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-900">
              ₹{paymentTotals.total.toFixed(2)}
            </div>
          </Card>
        </section>
      )}

      <Card className="hidden p-0 md:block overflow-x-auto">
        <DataTable className="divide-y divide-zinc-200">
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Date</DataTableHeaderCell>
              <DataTableHeaderCell>Items</DataTableHeaderCell>
              <DataTableHeaderCell>Total</DataTableHeaderCell>
              <DataTableHeaderCell>Payment Type</DataTableHeaderCell>
              <DataTableHeaderCell>Sold By</DataTableHeaderCell>
              <DataTableHeaderCell />
            </tr>
          </DataTableHead>
          <DataTableBody>
            {(loading ? [] : sales).map((s) => (
              <tr key={s.id || Math.random().toString(36)}>
                <DataTableCell>
                  {new Date(s.date).toLocaleString()}
                </DataTableCell>
                <DataTableCell>
                  {s.items.reduce((sum, it) => sum + it.quantity, 0)} items
                </DataTableCell>
                <DataTableCell>₹ {Number(s.totalAmount).toFixed(2)}</DataTableCell>
                <DataTableCell>
                  <Badge>
                    {s.paymentType || 'cash'}
                  </Badge>
                </DataTableCell>
                <DataTableCell>{userMap.get(s.soldBy)?.name || s.soldBy}</DataTableCell>
                <DataTableCell>
                  {s.id ? (
                    <Link
                      className="text-brand-700 underline"
                      href={`/sales/${s.id}`}
                    >
                      View
                    </Link>
                  ) : (
                    <span className="text-zinc-700">No ID</span>
                  )}
                </DataTableCell>
              </tr>
            ))}
            {loading && (
              <tr>
                <DataTableCell className="py-6 text-center text-sm text-zinc-700" colSpan={6}>
                  Loading...
                </DataTableCell>
              </tr>
            )}
            {!loading && sales.length === 0 && (
              <tr>
                <DataTableCell className="py-6 text-center text-sm text-zinc-700" colSpan={6}>
                  No sales found
                </DataTableCell>
              </tr>
            )}
          </DataTableBody>
        </DataTable>
      </Card>

      <div className="grid gap-3 md:hidden">
        {(loading ? [] : sales).map((s) => (
          <Card key={s.id || Math.random().toString(36)}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900">₹{Number(s.totalAmount).toFixed(2)}</p>
                <p className="text-xs text-zinc-600">{new Date(s.date).toLocaleString()}</p>
              </div>
              <Badge>{s.paymentType || 'cash'}</Badge>
            </div>
            <p className="mt-3 text-sm text-zinc-700">{s.items.reduce((sum, it) => sum + it.quantity, 0)} items</p>
            <p className="text-sm text-zinc-700">Sold by {userMap.get(s.soldBy)?.name || s.soldBy}</p>
            {s.id && <Link className="mt-2 inline-block text-sm font-medium text-brand-700 underline" href={`/sales/${s.id}`}>View details</Link>}
          </Card>
        ))}
        {loading && <Card><p className="text-center text-sm text-zinc-700">Loading...</p></Card>}
        {!loading && sales.length === 0 && <Card><p className="text-center text-sm text-zinc-700">No sales found</p></Card>}
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


