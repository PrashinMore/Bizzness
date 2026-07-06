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
import { PageEyebrow, PageHeader, PageShell, PageSubtitle, PageTitle } from '@/components/ui/shell';
import { StatCard } from '@/components/ui/stat-card';
import { InlineAlert, LoadingState, EmptyState } from '@/components/ui/states';
import { CHART_AXIS, CHART_COLORS, CHART_GRID, CHART_LINE } from '@/lib/design-tokens';

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

function formatRupee(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

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
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't load dashboard — check your connection and try again.",
        );
      } finally {
        setFetching(false);
      }
    }
    loadDashboard();
  }, [token, loading, user, trendRange]);

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <LoadingState message="Loading your workspace…" />
      </main>
    );
  }

  return (
    <PageShell className="py-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader>
          <div>
            <PageEyebrow>Dashboard</PageEyebrow>
            <PageTitle className="mt-1">Welcome, {user.name}</PageTitle>
            <PageSubtitle>
              Today&apos;s snapshot across sales, stock, and daily operations.
            </PageSubtitle>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/sales/new">
              <Button size="sm">Record Sale</Button>
            </Link>
            <Link href="/expenses/new">
              <Button size="sm" variant="secondary">
                Add Expense
              </Button>
            </Link>
          </div>
        </PageHeader>

        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

        {summary ? (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Today's sales"
              value={formatRupee(summary.totalSales)}
              sublabel={`${summary.totalOrders} orders`}
            />
            <StatCard
              label="Low-stock alerts"
              value={lowStock.length}
              sublabel={lowStock.length === 1 ? 'item needs attention' : 'items need attention'}
              tone={lowStock.length > 0 ? 'warning' : 'default'}
            />
            <StatCard
              label="Net profit today"
              value={formatRupee(summary.netProfit)}
              sublabel={`Expenses: ${formatRupee(summary.totalExpenses)}`}
              tone={summary.netProfit >= 0 ? 'success' : 'danger'}
            />
          </section>
        ) : null}

        <Card>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Sales trend</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => setTrendRange('7days')}
                variant={trendRange === '7days' ? 'primary' : 'secondary'}
                size="sm"
              >
                7 days
              </Button>
              <Button
                onClick={() => setTrendRange('30days')}
                variant={trendRange === '30days' ? 'primary' : 'secondary'}
                size="sm"
              >
                30 days
              </Button>
            </div>
          </div>
          {fetching ? (
            <LoadingState message="Loading chart…" className="h-64" />
          ) : salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis
                  dataKey="date"
                  stroke={CHART_AXIS}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis stroke={CHART_AXIS} tickFormatter={(value) => `₹${value}`} />
                <Tooltip
                  formatter={(value: number) => [`₹${value.toFixed(0)}`, 'Sales']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN')}
                />
                <Line
                  type="monotone"
                  dataKey="totalSales"
                  stroke={CHART_LINE}
                  strokeWidth={2}
                  dot={{ fill: CHART_LINE, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No sales recorded yet"
              description="Record your first sale to see daily trends here."
              actionLabel="Record Sale"
              actionHref="/sales/new"
            />
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle className="mb-4">Top sellers</CardTitle>
            {fetching ? (
              <LoadingState message="Loading…" className="py-4" />
            ) : topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-paper font-display text-sm font-semibold text-muted">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{product.productName}</p>
                        <p className="tabular-data text-xs text-muted">
                          {product.totalQuantity} units sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="tabular-data text-sm font-semibold text-ink">
                        {formatRupee(product.totalRevenue)}
                      </p>
                      <p className="text-xs text-muted">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No product sales yet"
                description="Sales by product will appear here once you start billing."
                actionLabel="Record Sale"
                actionHref="/sales/new"
              />
            )}
          </Card>

          <Card>
            <CardTitle className="mb-4">Expenses by category</CardTitle>
            {fetching ? (
              <LoadingState message="Loading…" className="py-4" />
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
                        const percent =
                          props.percentage !== undefined
                            ? props.percentage.toFixed(0)
                            : props.percent !== undefined
                              ? (props.percent * 100).toFixed(0)
                              : '0';
                        return `${props.category || 'Category'} (${percent}%)`;
                      }}
                      outerRadius={80}
                      fill={CHART_LINE}
                      dataKey="amount"
                    >
                      {expensesSummary.map((entry, index) => (
                        <Cell key={`cell-${entry.category}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`₹${value.toFixed(0)}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid w-full grid-cols-2 gap-2">
                  {expensesSummary.map((expense, index) => (
                    <div
                      key={expense.category}
                      className="flex items-center gap-2 rounded-lg border border-border p-2"
                    >
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-ink">{expense.category}</p>
                        <p className="tabular-data text-xs text-muted">
                          {formatRupee(expense.amount)} ({expense.percentage}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                title="No expenses logged"
                description="Track rent, supplies, and other costs to see where money goes."
                actionLabel="Add Expense"
                actionHref="/expenses/new"
              />
            )}
          </Card>
        </div>

        {lowStock.length > 0 ? (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>Low stock alerts</CardTitle>
              <Link
                href="/products"
                className="text-sm font-medium text-accent-dark underline-offset-4 hover:underline"
              >
                Manage inventory
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lowStock.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-lg border border-border border-l-4 border-l-warning bg-warning-muted/30 p-3"
                >
                  {item.imageUrl ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${item.imageUrl}`}
                      alt={item.name}
                      className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                    <p className="text-xs text-muted">{item.category}</p>
                    <p className="tabular-data mt-1 text-xs font-medium text-warning">
                      {item.stock} {item.unit} left — reorder soon
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
