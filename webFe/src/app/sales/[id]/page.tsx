'use client';

import { useAuth } from '@/contexts/auth-context';
import { salesApi, productsApi, usersApi, invoicesApi } from '@/lib/api-client';
import type { Sale } from '@/types/sale';
import type { Product } from '@/types/product';
import type { User } from '@/types/user';
import type { Invoice } from '@/types/invoice';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

export default function SaleDetailPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const validId = typeof id === 'string' && id !== 'undefined' ? id : null;
  const [sale, setSale] = useState<Sale | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [localPaymentType, setLocalPaymentType] = useState<string>('');
  const [localIsPaid, setLocalIsPaid] = useState<boolean>(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');

  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  const userMap = useMemo(() => {
    return new Map(users.map((u) => [u.id, u]));
  }, [users]);

  const organizationId = useMemo(() => {
    return user?.organizations?.[0]?.id || '';
  }, [user]);

  useEffect(() => {
    async function load() {
      if (!token || !validId) return;
      setLoading(true);
      setError(null);
      try {
        const [saleData, productsData, usersData] = await Promise.all([
          salesApi.get(token, validId),
          productsApi.list(token),
          usersApi.list(token),
        ]);
        setSale(saleData);
        setProducts(productsData);
        setUsers(usersData);
        setLocalPaymentType(saleData.paymentType || 'cash');
        setLocalIsPaid(saleData.isPaid || false);

        // Check if invoice exists
        if (organizationId) {
          try {
            const invoices = await invoicesApi.list(token, organizationId, {
              page: 1,
              size: 100,
            });
            const existingInvoice = invoices.invoices.find(
              (inv) => inv.billingSessionId === validId,
            );
            if (existingInvoice) {
              setInvoice(existingInvoice);
            }
          } catch {
            // Ignore invoice errors
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sale');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, validId, organizationId]);

  const handleUpdatePayment = async () => {
    if (!token || !validId) return;
    setUpdating(true);
    setError(null);
    try {
      const updated = await salesApi.update(token, validId, {
        paymentType: localPaymentType,
        isPaid: localIsPaid,
      });
      setSale(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment');
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!token || !validId || !organizationId) return;
    setGeneratingInvoice(true);
    setError(null);
    try {
      const result = await invoicesApi.createFromSale(
        token,
        organizationId,
        validId,
        {
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          customerGstin: customerGstin || undefined,
          forceSyncPdf: false,
        },
      );
      setInvoice(result.invoice);
      setShowInvoiceForm(false);
      
      // Always try to open PDF, even if it's queued
      if (result.status === 'ready' && result.pdfUrl) {
        // PDF is ready, open it directly
        const pdfUrl = invoicesApi.getPdfUrl(token, organizationId, result.invoice.id);
        const response = await fetch(pdfUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
        }
      } else {
        // PDF is queued, generate it and then open
        try {
          await invoicesApi.generatePdf(token, organizationId, result.invoice.id);
          // Poll for PDF to be ready
          let attempts = 0;
          const maxAttempts = 15;
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const updated = await invoicesApi.get(token, organizationId, result.invoice.id);
            if (updated.pdfUrl) {
              const pdfUrl = invoicesApi.getPdfUrl(token, organizationId, result.invoice.id);
              const response = await fetch(pdfUrl, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
              });
              
              if (response.ok) {
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
              }
              break;
            }
            attempts++;
          }
        } catch (err) {
          console.error('Failed to generate/open PDF:', err);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sale Details</h1>
        <div className="flex gap-2">
          {invoice ? (
            <button
              onClick={async () => {
                if (!token || !organizationId) return;
                try {
                  // If PDF not ready, generate it first
                  if (!invoice.pdfUrl) {
                    await invoicesApi.generatePdf(token, organizationId, invoice.id);
                    // Poll for PDF to be ready
                    let attempts = 0;
                    const maxAttempts = 10;
                    while (attempts < maxAttempts) {
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      const updated = await invoicesApi.get(token, organizationId, invoice.id);
                      if (updated.pdfUrl) {
                        invoice.pdfUrl = updated.pdfUrl;
                        break;
                      }
                      attempts++;
                    }
                  }
                  
                  if (!invoice.pdfUrl) {
                    throw new Error('PDF generation timed out');
                  }
                  
                  const pdfUrl = invoicesApi.getPdfUrl(token, organizationId, invoice.id);
                  const response = await fetch(pdfUrl, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                    credentials: 'include',
                  });
                  
                  if (!response.ok) {
                    throw new Error('Failed to load PDF');
                  }
                  
                  const blob = await response.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  window.open(blobUrl, '_blank');
                } catch (err) {
                  // Fallback to invoice page if PDF fails
                  router.push(`/invoices/${invoice.id}`);
                }
              }}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              View Invoice
            </button>
          ) : (
            <button
              onClick={() => setShowInvoiceForm(true)}
              className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700"
            >
              Generate Invoice
            </button>
          )}
          <Link href="/sales" className="text-zinc-900 underline">
            Back to Sales
          </Link>
        </div>
      </header>

      {loading && <div>Loading...</div>}
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
      {sale && (
        <section className="space-y-4 rounded border border-zinc-200 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-sm text-zinc-700">Sale ID</div>
              <div className="font-mono text-sm">{sale.id}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-700">Date</div>
              <div>{new Date(sale.date).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-700">Sold By</div>
              <div>{userMap.get(sale.soldBy)?.name || sale.soldBy}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-700">Total Amount</div>
              <div>₹ {Number(sale.totalAmount).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-700">Payment Type</div>
              <div className="capitalize">{sale.paymentType || 'cash'}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-700">Payment Status</div>
              <div className={sale.isPaid ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                {sale.isPaid ? 'Paid' : 'Pending'}
              </div>
            </div>
          </div>

          {/* Invoice Generation Form */}
          {showInvoiceForm && !invoice && (
            <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900">Generate Invoice</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Customer Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter customer phone"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Customer GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                    placeholder="Enter customer GSTIN"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateInvoice}
                    disabled={generatingInvoice}
                    className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {generatingInvoice ? 'Generating...' : 'Generate Invoice'}
                  </button>
                  <button
                    onClick={() => {
                      setShowInvoiceForm(false);
                      setCustomerName('');
                      setCustomerPhone('');
                      setCustomerGstin('');
                    }}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Update Section */}
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900">Update Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Payment Type
                </label>
                <select
                  value={localPaymentType}
                  onChange={(e) => setLocalPaymentType(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                >
                  <option value="cash">Cash</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localIsPaid}
                    onChange={(e) => setLocalIsPaid(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-zinc-200"
                  />
                  <span className="text-sm font-medium text-zinc-700">
                    Mark payment as completed
                  </span>
                </label>
              </div>
              <button
                onClick={handleUpdatePayment}
                disabled={updating || (localPaymentType === sale.paymentType && localIsPaid === sale.isPaid)}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Payment'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                    Qty
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                    Price
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-600">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {sale.items.map((it) => {
                  const product = productMap.get(it.productId);
                  return (
                    <tr key={it.id}>
                      <td className="px-4 py-2 text-sm">
                        {product ? product.name : it.productId}
                      </td>
                      <td className="px-4 py-2 text-sm">{it.quantity}</td>
                      <td className="px-4 py-2 text-sm">₹ {Number(it.sellingPrice).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">₹ {Number(it.subtotal).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}


