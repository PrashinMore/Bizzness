'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { dashboardApi } from '@/lib/api-client';
import Link from 'next/link';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { PageHeader, PageShell } from '@/components/ui/shell';

type DashboardSummary = {
  totalSales: number;
  totalExpenses: number;
  costOfGoodsSold: number;
  grossProfit: number;
  netProfit: number;
  totalOrders: number;
};
type SalesTrendData = { date: string; totalSales: number };
type TopProduct = {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
};
type LowStockItem = {
  id: string;
  name: string;
  category: string;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  imageUrl: string | null;
};
type ExpenseSummary = { category: string; amount: number; percentage: number };
type PieLabelProps = {
  category?: string;
  percentage?: number;
  percent?: number;
};

const COLORS = ['#315ed8', '#16a34a', '#a16207', '#dc2626', '#6d28d9', '#db2777'];

export default function DashboardPage() {
  const { user, loading } = useRequireAuth();
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [expensesSummary, setExpensesSummary] = useState<ExpenseSummary[]>([]);
  const [trendRange, setTrendRange] = useState<'7days' | '30days'>('7days');
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      if (!token || loading || !user) return;
      setFetching(true);
      setError(null);
      try {
        const [summaryData, trendData, topProductsData, lowStockData, expensesData] = await Promise.all([
          dashboardApi.getSummary(token),
          dashboardApi.getSalesTrend(token, trendRange),
          dashboardApi.getTopProducts(token, 5),
          dashboardApi.getLowStock(token),
          dashboardApi.getExpensesSummary(token),
        ]);
        setSummary(summaryData);
        setSalesTrend(trendData);
        setTopProducts(topProductsData);
        setLowStock(lowStockData);
        setExpensesSummary(expensesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
      } finally {
        setFetching(false);
      }
    }
    loadDashboard();
  }, [token, loading, user, trendRange]);

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-app">
        <p className="text-sm text-zinc-700">Loading your workspace…</p>
      </main>
    );
  }

  return (
    <PageShell className="py-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900 md:text-3xl">Welcome, {user.name}</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Your daily snapshot across billing, inventory, and operations.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/sales/new">
              <Button size="sm">Record Sale</Button>
            </Link>
            <Link href="/expenses/new">
              <Button size="sm" variant="secondary">Add Expense</Button>
            </Link>
          </div>
        </PageHeader>

        {error && (
          <div className="rounded-lg border border-danger-100 bg-danger-100 px-3 py-2 text-sm text-danger-700">
            {error}
          </div>
        )}

        {summary && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-sm uppercase tracking-wide text-zinc-700">Total Sales</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">₹{summary.totalSales.toFixed(2)}</p>
              <p className="mt-1 text-xs text-zinc-700">Today</p>
            </Card>
            <Card>
              <p className="text-sm uppercase tracking-wide text-zinc-700">Total Expenses</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">₹{summary.totalExpenses.toFixed(2)}</p>
              <p className="mt-1 text-xs text-zinc-700">Today</p>
            </Card>
            <Card>
              <p className="text-sm uppercase tracking-wide text-zinc-700">Net Profit</p>
              <p className={`mt-2 text-3xl font-bold ${summary.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                ₹{summary.netProfit.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-zinc-700">Today</p>
            </Card>
            <Card>
              <p className="text-sm uppercase tracking-wide text-zinc-700">Total Orders</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.totalOrders}</p>
              <p className="mt-1 text-xs text-zinc-700">Today</p>
            </Card>
          </section>
        )}

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Sales Trend</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => setTrendRange('7days')} variant={trendRange === '7days' ? 'primary' : 'secondary'} size="sm">
                7 Days
              </Button>
              <Button onClick={() => setTrendRange('30days')} variant={trendRange === '30days' ? 'primary' : 'secondary'} size="sm">
                30 Days
              </Button>
            </div>
          </div>
          {fetching ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-zinc-700">Loading chart…</p>
            </div>
          ) : salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="date"
                  stroke="#71717a"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis stroke="#71717a" tickFormatter={(value) => `₹${value}`} />
                <Tooltip
                  formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Sales']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Line type="monotone" dataKey="totalSales" stroke="#315ed8" strokeWidth={2} dot={{ fill: '#315ed8', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-zinc-700">No sales data available</p>
            </div>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle className="mb-4">Top Selling Products</CardTitle>
            {fetching ? (
              <p className="text-sm text-zinc-700">Loading…</p>
            ) : topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.productId} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{product.productName}</p>
                        <p className="text-xs text-zinc-700">{product.totalQuantity} units sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900">₹{product.totalRevenue.toFixed(2)}</p>
                      <p className="text-xs text-zinc-700">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-700">No product sales data</p>
            )}
          </Card>
          <Card>
            <CardTitle className="mb-4">Expenses by Category</CardTitle>
            {fetching ? (
              <p className="text-sm text-zinc-700">Loading…</p>
            ) : expensesSummary.length > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={expensesSummary}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: PieLabelProps) => {
                        const percent = props.percentage !== undefined
                          ? props.percentage.toFixed(1)
                          : props.percent !== undefined
                          ? (props.percent * 100).toFixed(1)
                          : '0';
                        return `${props.category || 'Category'} (${percent}%)`;
                      }}
                      outerRadius={80}
                      fill="#315ed8"
                      dataKey="amount"
                    >
                      {expensesSummary.map((entry, index) => (
                        <Cell key={`cell-${entry.category}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid w-full grid-cols-2 gap-2">
                  {expensesSummary.map((expense) => (
                    <div key={expense.category} className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2">
                      <div className="h-3 w-3 rounded-full bg-brand-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-900">{expense.category}</p>
                        <p className="text-xs text-zinc-700">₹{expense.amount.toFixed(2)} ({expense.percentage}%)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-700">No expense data available</p>
            )}
          </Card>
        </div>

        {!!lowStock.length && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>Low Stock Alerts</CardTitle>
              <Link href="/products" className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline">
                Manage Inventory
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lowStock.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-lg border border-warning-100 bg-warning-100/40 p-3">
                  {item.imageUrl && (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${item.imageUrl}`}
                      alt={item.name}
                      className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">{item.name}</p>
                    <p className="text-xs text-zinc-700">{item.category}</p>
                    <p className="mt-1 text-xs font-medium text-warning-700">
                      Only {item.stock} {item.unit} remaining
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
