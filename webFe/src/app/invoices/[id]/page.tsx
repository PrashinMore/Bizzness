'use client';

import { useAuth } from '@/contexts/auth-context';
import { invoicesApi } from '@/lib/api-client';
import type { Invoice } from '@/types/invoice';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

export default function InvoiceDetailPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const invoiceId = params?.id;
  const validId = typeof invoiceId === 'string' && invoiceId !== 'undefined' ? invoiceId : null;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState<'ready' | 'queued' | 'generating'>('queued');

  const organizationId = useMemo(() => {
    return user?.organizations?.[0]?.id || '';
  }, [user]);

  useEffect(() => {
    async function load() {
      if (!token || !validId || !organizationId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await invoicesApi.get(token, organizationId, validId);
        setInvoice(result.invoice);
        setPdfStatus(result.status);
        
        // Poll for PDF if queued
        if (result.status === 'queued' && !result.pdfUrl) {
          const pollInterval = setInterval(async () => {
            try {
              const updated = await invoicesApi.get(token, organizationId, validId);
              if (updated.status === 'ready' && updated.pdfUrl) {
                setInvoice(updated.invoice);
                setPdfStatus('ready');
                clearInterval(pollInterval);
              }
            } catch {
              // Ignore polling errors
            }
          }, 2000);
          
          // Stop polling after 30 seconds
          setTimeout(() => clearInterval(pollInterval), 30000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, validId, organizationId]);

  const handleGeneratePdf = async () => {
    if (!token || !validId || !organizationId) return;
    setPdfStatus('generating');
    try {
      const result = await invoicesApi.generatePdf(token, organizationId, validId);
      setInvoice(result.invoice);
      setPdfStatus(result.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
      setPdfStatus('queued');
    }
  };

  const handleViewPdf = async () => {
    if (!token || !validId || !organizationId || !invoice?.pdfUrl) return;
    try {
      const pdfUrl = invoicesApi.getPdfUrl(token, organizationId, validId);
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
      setError(err instanceof Error ? err.message : 'Failed to view PDF');
    }
  };

  const handlePrint = async () => {
    if (!token || !validId || !organizationId || !invoice?.pdfUrl) return;
    try {
      const pdfUrl = invoicesApi.getPdfUrl(token, organizationId, validId);
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
      const pdfWindow = window.open(blobUrl, '_blank');
      if (pdfWindow) {
        pdfWindow.onload = () => {
          pdfWindow.print();
        };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to print PDF');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹ ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Invoice Details</h1>
        <div className="flex gap-2">
          {invoice?.pdfUrl && (
            <>
              <button
                onClick={handleViewPdf}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                style={{padding: '5px 10px'}}
              >
                View PDF
              </button>
              <button
                onClick={handlePrint}
                className="rounded bg-ink px-4 py-2 text-white hover:bg-ink-light"
                style={{padding: '5px 10px'}}
              >
                Print
              </button>
            </>
          )}
          {(pdfStatus === 'queued' || pdfStatus === 'generating') && (
            <button
              onClick={handleGeneratePdf}
              disabled={pdfStatus === 'generating'}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {pdfStatus === 'generating' ? 'Generating...' : 'Generate PDF'}
            </button>
          )}
          <Link href="/sales" className="text-ink underline">
            Back to Sales
          </Link>
        </div>
      </header>

      {loading && <div>Loading...</div>}
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-danger">
          {error}
        </div>
      )}
      {invoice && (
        <div className="space-y-8">
          {/* Invoice Info */}
          <section className="rounded border border-border bg-surface p-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted">Invoice Number</div>
                <div className="text-lg font-semibold text-ink">{invoice.invoiceNumber}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted">Date</div>
                <div className="text-ink">{formatDate(invoice.createdAt)}</div>
              </div>
              {invoice.customerName && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted">Customer</div>
                  <div className="text-ink">{invoice.customerName}</div>
                  {invoice.customerPhone && (
                    <div className="text-sm text-muted">{invoice.customerPhone}</div>
                  )}
                  {invoice.customerGstin && (
                    <div className="text-sm text-muted">GSTIN: {invoice.customerGstin}</div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted">Status</div>
                <div>
                  {pdfStatus === 'ready' ? (
                    <span className="text-green-600 font-medium">Ready</span>
                  ) : pdfStatus === 'generating' ? (
                    <span className="text-blue-600 font-medium">Generating...</span>
                  ) : (
                    <span className="text-orange-600 font-medium">PDF Pending</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Items Table */}
          <section className="overflow-x-auto rounded border border-border bg-surface">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-paper">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted">#</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted">Item</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-muted">Qty</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted">Rate</th>
                  {invoice.taxAmount > 0 && (
                    <th className="px-6 py-4 text-right text-sm font-medium text-muted">Tax</th>
                  )}
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {invoice.items.map((item, index) => (
                  <tr key={index} className="hover:bg-paper">
                    <td className="px-6 py-4 text-sm text-ink">{index + 1}</td>
                    <td className="px-6 py-4 text-sm text-ink">{item.name}</td>
                    <td className="px-6 py-4 text-center text-sm text-ink">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-sm text-ink">{formatCurrency(item.rate)}</td>
                    {invoice.taxAmount > 0 && (
                      <td className="px-6 py-4 text-right text-sm text-ink">
                        {formatCurrency(item.tax || 0)}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right text-sm font-medium text-ink">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Totals */}
          <section className="ml-auto w-full max-w-md rounded border border-border bg-surface p-8">
            <div className="space-y-4">
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted">Subtotal:</span>
                <span className="text-ink font-medium">{formatCurrency(parseFloat(invoice.subtotal.toString()))}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-muted">Discount:</span>
                  <span className="text-ink font-medium">-{formatCurrency(parseFloat(invoice.discountAmount.toString()))}</span>
                </div>
              )}
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-muted">Tax:</span>
                  <span className="text-ink font-medium">{formatCurrency(parseFloat(invoice.taxAmount.toString()))}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-border pt-4 mt-2 text-lg font-semibold">
                <span className="text-ink">Total:</span>
                <span className="text-ink">{formatCurrency(parseFloat(invoice.total.toString()))}</span>
              </div>
            </div>
          </section>

          {/* HTML Preview */}
          {invoice.htmlSnapshot && (
            <section className="rounded border border-border bg-surface p-8">
              <h3 className="mb-6 text-lg font-semibold text-center text-ink">Invoice Preview</h3>
              <style dangerouslySetInnerHTML={{
                __html: `
                  .invoice-preview-wrapper {
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    width: 100%;
                    overflow-x: auto;
                    padding: 20px 0;
                  }
                  .invoice-preview-wrapper .invoice-preview {
                    width: 100%;
                    max-width: 800px;
                    margin: 0 auto;
                  }
                  .invoice-preview-wrapper .invoice-preview .invoice-container {
                    margin: 0 auto !important;
                    max-width: 800px !important;
                    width: 100% !important;
                  }
                `
              }} />
              <div className="invoice-preview-wrapper">
                <div
                  className="invoice-preview"
                  dangerouslySetInnerHTML={{ __html: invoice.htmlSnapshot }}
                />
              </div>
            </section>
          )}
        </div>
      )}
      </div>
    </main>
  );
}

