'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { reportsApi } from '@/lib/api-client';

type Tab = 'sales' | 'profit-loss' | 'inventory' | 'expenses';

export default function ReportsPage() {
  const { user, loading } = useRequireAuth();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('sales');
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Sales Report
  const [salesReport, setSalesReport] = useState<any>(null);

  // Profit & Loss Report
  const [profitLossReport, setProfitLossReport] = useState<any>(null);

  // Inventory Report
  const [inventoryReport, setInventoryReport] = useState<any>(null);

  // Expense Report
  const [expenseReport, setExpenseReport] = useState<any>(null);

  useEffect(() => {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setToDate(today.toISOString().split('T')[0]);
    setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const loadSalesReport = async () => {
    if (!token) return;
    setLoadingReport(true);
    setError(null);
    try {
      const data = await reportsApi.getSalesReport(token, fromDate || undefined, toDate || undefined);
      setSalesReport(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load sales report.');
      }
    } finally {
      setLoadingReport(false);
    }
  };

  const loadProfitLossReport = async () => {
    if (!token) return;
    setLoadingReport(true);
    setError(null);
    try {
      const data = await reportsApi.getProfitLossReport(token, fromDate || undefined, toDate || undefined);
      setProfitLossReport(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load profit & loss report.');
      }
    } finally {
      setLoadingReport(false);
    }
  };

  const loadInventoryReport = async () => {
    if (!token) return;
    setLoadingReport(true);
    setError(null);
    try {
      const data = await reportsApi.getInventoryReport(token);
      setInventoryReport(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load inventory report.');
      }
    } finally {
      setLoadingReport(false);
    }
  };

  const loadExpenseReport = async () => {
    if (!token) return;
    setLoadingReport(true);
    setError(null);
    try {
      const data = await reportsApi.getExpenseReport(token, fromDate || undefined, toDate || undefined);
      setExpenseReport(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load expense report.');
      }
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (!token || loading || !user) return;
    if (activeTab === 'sales') {
      loadSalesReport();
    } else if (activeTab === 'profit-loss') {
      loadProfitLossReport();
    } else if (activeTab === 'inventory') {
      loadInventoryReport();
    } else if (activeTab === 'expenses') {
      loadExpenseReport();
    }
  }, [activeTab, token, loading, user, fromDate, toDate]);

  const handleExportCSV = async () => {
    if (!token) return;
    try {
      const blob = await reportsApi.exportSalesReportCSV(token, fromDate || undefined, toDate || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${fromDate || 'all'}-${toDate || 'all'}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to export report.');
      }
    }
  };

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (user.role !== 'admin') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-red-600">Access denied. Admin only.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-zinc-900">Reports & Insights</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Analyze your business performance and export data
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-zinc-200">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'sales'
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Sales Report
          </button>
          <button
            onClick={() => setActiveTab('profit-loss')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'profit-loss'
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Profit & Loss
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'inventory'
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'expenses'
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Expenses
          </button>
        </div>

        {/* Date Filters (for reports that need them) */}
        {(activeTab === 'sales' || activeTab === 'profit-loss' || activeTab === 'expenses') && (
          <div className="mb-6 flex gap-4 rounded-lg bg-white p-4 shadow-sm">
            <div>
              <label className="block text-xs font-medium text-zinc-700">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 rounded border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 rounded border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
            {activeTab === 'sales' && (
              <div className="flex items-end">
                <button
                  onClick={handleExportCSV}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Export CSV
                </button>
              </div>
            )}
          </div>
        )}

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          {loadingReport ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-zinc-500">Loading report…</p>
            </div>
          ) : (
            <>
              {/* Sales Report */}
              {activeTab === 'sales' && salesReport && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Sales Report</h2>
                    <p className="text-sm text-zinc-500">
                      {salesReport.period.from} to {salesReport.period.to}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-zinc-200 p-4">
                      <p className="text-xs text-zinc-500">Total Sales</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900">
                        ₹{salesReport.summary.totalSales.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 p-4">
                      <p className="text-xs text-zinc-500">Total Orders</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900">
                        {salesReport.summary.totalOrders}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 p-4">
                      <p className="text-xs text-zinc-500">Average Order Value</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900">
                        ₹{salesReport.summary.averageOrderValue.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-zinc-900">Product Breakdown</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-zinc-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-700">
                                Product
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-700">
                                Quantity
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-700">
                                Revenue
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {salesReport.productBreakdown.map((product: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-3 py-2">{product.name}</td>
                                <td className="px-3 py-2 text-right">{product.quantity}</td>
                                <td className="px-3 py-2 text-right">₹{product.revenue.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-zinc-900">Staff Breakdown</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-zinc-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-700">
                                Staff
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-700">
                                Sales
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-700">
                                Orders
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {salesReport.staffBreakdown.map((staff: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-3 py-2">{staff.name}</td>
                                <td className="px-3 py-2 text-right">₹{staff.sales.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right">{staff.orders}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Profit & Loss Report */}
              {activeTab === 'profit-loss' && profitLossReport && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Profit & Loss Report</h2>
                    <p className="text-sm text-zinc-500">
                      {profitLossReport.period.from} to {profitLossReport.period.to}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-zinc-200 pb-2">
                      <span className="text-sm text-zinc-700">Revenue</span>
                      <span className="text-sm font-semibold text-zinc-900">
                        ₹{profitLossReport.revenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-200 pb-2">
                      <span className="text-sm text-zinc-700">Cost of Goods Sold</span>
                      <span className="text-sm font-semibold text-zinc-900">
                        ₹{profitLossReport.costOfGoodsSold.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-200 pb-2">
                      <span className="text-sm font-medium text-zinc-900">Gross Profit</span>
                      <span
                        className={`text-sm font-semibold ${
                          profitLossReport.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        ₹{profitLossReport.grossProfit.toFixed(2)} ({profitLossReport.grossMargin}%)
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-200 pb-2">
                      <span className="text-sm text-zinc-700">Operating Expenses</span>
                      <span className="text-sm font-semibold text-zinc-900">
                        ₹{profitLossReport.operatingExpenses.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-sm font-medium text-zinc-900">Net Profit</span>
                      <span
                        className={`text-lg font-semibold ${
                          profitLossReport.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        ₹{profitLossReport.netProfit.toFixed(2)} ({profitLossReport.netMargin}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Inventory Report */}
              {activeTab === 'inventory' && inventoryReport && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Inventory Report</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-zinc-200 p-4">
                      <p className="text-xs text-zinc-500">Total Products</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900">
                        {inventoryReport.summary.totalProducts}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 p-4">
                      <p className="text-xs text-zinc-500">Total Stock Value</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900">
                        ₹{inventoryReport.summary.totalStockValue.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 p-4">
                      <p className="text-xs text-zinc-500">Low Stock Items</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900">
                        {inventoryReport.summary.lowStockItems}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-zinc-900">Product Details</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-700">
                              Product
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-700">
                              Category
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-zinc-700">
                              Stock
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-zinc-700">
                              Stock Value
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-zinc-700">
                              Sales (30d)
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-zinc-700">
                              Movement
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                          {inventoryReport.products.map((product: any) => (
                            <tr key={product.id}>
                              <td className="px-3 py-2">{product.name}</td>
                              <td className="px-3 py-2">{product.category}</td>
                              <td className="px-3 py-2 text-right">
                                {product.stock} {product.unit}
                              </td>
                              <td className="px-3 py-2 text-right">₹{product.stockValue.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">{product.salesLast30Days}</td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    product.movement === 'fast'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : product.movement === 'medium'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-zinc-100 text-zinc-700'
                                  }`}
                                >
                                  {product.movement}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Expense Report */}
              {activeTab === 'expenses' && expenseReport && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Expense Report</h2>
                    <p className="text-sm text-zinc-500">
                      {expenseReport.period.from} to {expenseReport.period.to}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-zinc-200 p-4">
                      <p className="text-xs text-zinc-500">Total Expenses</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900">
                        ₹{expenseReport.summary.totalExpenses.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 p-4">
                      <p className="text-xs text-zinc-500">Total Transactions</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900">
                        {expenseReport.summary.totalTransactions}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 p-4">
                      <p className="text-xs text-zinc-500">Average Expense</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900">
                        ₹{expenseReport.summary.averageExpense.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-zinc-900">Category Breakdown</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-zinc-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-700">
                                Category
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-700">
                                Amount
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-700">
                                %
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {expenseReport.categoryBreakdown.map((cat: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-3 py-2">{cat.category}</td>
                                <td className="px-3 py-2 text-right">₹{cat.amount.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right">{cat.percentage}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-zinc-900">Monthly Breakdown</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-zinc-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-700">
                                Month
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-700">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {expenseReport.monthlyBreakdown.map((month: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-3 py-2">{month.month}</td>
                                <td className="px-3 py-2 text-right">₹{month.amount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

