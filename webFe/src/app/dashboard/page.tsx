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
  Legend,
  ResponsiveContainer,
} from 'recharts';

type DashboardSummary = {
  totalSales: number;
  totalExpenses: number;
  costOfGoodsSold: number;
  grossProfit: number;
  netProfit: number;
  totalOrders: number;
};

type SalesTrendData = {
  date: string;
  totalSales: number;
};

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

type ExpenseSummary = {
  category: string;
  amount: number;
  percentage: number;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
      if (!token || loading || !user) {
        return;
      }
      setFetching(true);
      setError(null);
      try {
        const [summaryData, trendData, topProductsData, lowStockData, expensesData] =
          await Promise.all([
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
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unable to load dashboard data.');
        }
      } finally {
        setFetching(false);
      }
    }
    loadDashboard();
  }, [token, loading, user, trendRange]);

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-700">Loading your workspace…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-zinc-700">
                Dashboard
              </p>
              <h1 className="text-3xl font-semibold text-zinc-900">
                Welcome, {user.name}
              </h1>
              <p className="mt-2 text-sm text-zinc-700">
                Overview of your business performance
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Today's Summary Cards */}
        {summary && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-wide text-zinc-700">
                Total Sales
              </p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">
                ₹{summary.totalSales.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-zinc-700">Today</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-wide text-zinc-700">
                Total Expenses
              </p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">
                ₹{summary.totalExpenses.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-zinc-700">Today</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-wide text-zinc-700">
                Net Profit
              </p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                ₹{summary.netProfit.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-zinc-700">Today</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-wide text-zinc-700">
                Total Orders
              </p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">
                {summary.totalOrders}
              </p>
              <p className="mt-1 text-xs text-zinc-700">Today</p>
            </div>
          </section>
        )}

        {/* Sales Trend Chart */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Sales Trend</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setTrendRange('7days')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                  trendRange === '7days'
                    ? 'bg-zinc-900 text-white'
                    : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTrendRange('30days')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                  trendRange === '30days'
                    ? 'bg-zinc-900 text-white'
                    : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                30 Days
              </button>
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
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  stroke="#71717a"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Sales']}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleDateString();
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalSales"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-zinc-700">No sales data available</p>
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Selling Products */}
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">
              Top Selling Products
            </h2>
            {fetching ? (
              <p className="text-sm text-zinc-700">Loading…</p>
            ) : topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {product.productName}
                        </p>
                        <p className="text-xs text-zinc-700">
                          {product.totalQuantity} units sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900">
                        ₹{product.totalRevenue.toFixed(2)}
                      </p>
                      <p className="text-xs text-zinc-700">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-700">No product sales data</p>
            )}
          </section>

          {/* Expenses Summary Pie Chart */}
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">
              Expenses by Category
            </h2>
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
                      label={(props: any) => {
                        const entry = props as ExpenseSummary & { percent?: number };
                        const percent = entry.percentage !== undefined 
                          ? entry.percentage.toFixed(1)
                          : entry.percent !== undefined
                          ? (entry.percent * 100).toFixed(1)
                          : '0';
                        return `${entry.category} (${percent}%)`;
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {expensesSummary.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid w-full grid-cols-2 gap-2">
                  {expensesSummary.map((expense, index) => (
                    <div
                      key={expense.category}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2"
                    >
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-900 truncate">
                          {expense.category}
                        </p>
                        <p className="text-xs text-zinc-700">
                          ₹{expense.amount.toFixed(2)} ({expense.percentage}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-700">No expense data available</p>
            )}
          </section>
        </div>

        {/* Low Stock Alerts */}
        {lowStock.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                Low Stock Alerts
              </h2>
              <Link
                href="/products"
                className="text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
              >
                Manage Inventory
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lowStock.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3"
                >
                  {item.imageUrl && (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${item.imageUrl}`}
                      alt={item.name}
                      className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-zinc-700">{item.category}</p>
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Only {item.stock} {item.unit} remaining
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Links */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Quick Links</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-600">
              <li>
                <Link
                  href="/menu"
                  className="font-medium text-zinc-900 underline-offset-4 hover:underline"
                >
                  Menu & Checkout
                </Link>
              </li>
              <li>
                <Link
                  href="/sales/new"
                  className="font-medium text-zinc-900 underline-offset-4 hover:underline"
                >
                  Record a Sale
                </Link>
              </li>
              <li>
                <Link
                  href="/expenses/new"
                  className="font-medium text-zinc-900 underline-offset-4 hover:underline"
                >
                  Add Expense
                </Link>
              </li>
              {user.role === 'admin' && (
                <>
                  <li>
                    <Link
                      href="/products"
                      className="font-medium text-zinc-900 underline-offset-4 hover:underline"
                    >
                      Manage Inventory
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/users"
                      className="font-medium text-zinc-900 underline-offset-4 hover:underline"
                    >
                      Manage Users
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">View Reports</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-600">
              <li>
                <Link
                  href="/sales"
                  className="font-medium text-zinc-900 underline-offset-4 hover:underline"
                >
                  Sales History
                </Link>
              </li>
              <li>
                <Link
                  href="/expenses"
                  className="font-medium text-zinc-900 underline-offset-4 hover:underline"
                >
                  Expense History
                </Link>
              </li>
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
