'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { settingsApi, type Settings, invoicesApi } from '@/lib/api-client';
import type { OrganizationInvoiceSettings } from '@/types/invoice';

type Tab = 'business' | 'billing' | 'inventory' | 'invoices' | 'tables' | 'support';

export default function SettingsPage() {
  const { user, loading } = useRequireAuth();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('business');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Business form state
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Billing form state
  const [taxRate, setTaxRate] = useState(0);
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [invoiceFooter, setInvoiceFooter] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [defaultDiscountType, setDefaultDiscountType] = useState<'percentage' | 'fixed'>('percentage');

  // Inventory form state
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState(10);
  const [defaultUnit, setDefaultUnit] = useState('unit');
  const [stockWarningAlerts, setStockWarningAlerts] = useState(true);

  // Invoice settings state
  const [invoiceSettings, setInvoiceSettings] = useState<OrganizationInvoiceSettings | null>(null);
  const [enableInvoices, setEnableInvoices] = useState(true);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [invoiceSettingsPrefix, setInvoiceSettingsPrefix] = useState('INV');
  const [invoiceBranchPrefix, setInvoiceBranchPrefix] = useState(true);
  const [invoiceResetCycle, setInvoiceResetCycle] = useState<'never' | 'monthly' | 'yearly'>('monthly');
  const [invoicePadding, setInvoicePadding] = useState(5);
  const [invoiceDisplayFormat, setInvoiceDisplayFormat] = useState<'A4' | 'thermal'>('A4');
  const [includeLogo, setIncludeLogo] = useState(true);

  // Table settings state
  const [enableTables, setEnableTables] = useState(false);
  const [enableReservations, setEnableReservations] = useState(false);
  const [allowTableMerge, setAllowTableMerge] = useState(true);
  const [autoFreeTableOnPayment, setAutoFreeTableOnPayment] = useState(true);

  const organizationId = useMemo(() => {
    return user?.organizations?.[0]?.id || '';
  }, [user]);

  useEffect(() => {
    async function loadSettings() {
      if (!token || loading || !user) return;
      setLoadingSettings(true);
      setError(null);
      try {
        const data = await settingsApi.get(token);
        setSettings(data);
        // Populate form fields
        setBusinessName(data.businessName || '');
        setBusinessAddress(data.businessAddress || '');
        setGstNumber(data.gstNumber || '');
        setContactPhone(data.contactPhone || '');
        setContactEmail(data.contactEmail || '');
        setLogoPreview(data.businessLogo ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${data.businessLogo}` : null);
        setTaxRate(data.taxRate);
        setInvoicePrefix(data.invoicePrefix);
        setInvoiceFooter(data.invoiceFooter || '');
        setCurrency(data.currency);
        setDefaultDiscountType(data.defaultDiscountType as 'percentage' | 'fixed');
        setDefaultLowStockThreshold(data.defaultLowStockThreshold);
        setDefaultUnit(data.defaultUnit);
        setStockWarningAlerts(data.stockWarningAlerts);
        setEnableTables(data.enableTables ?? false);
        setEnableReservations(data.enableReservations ?? false);
        setAllowTableMerge(data.allowTableMerge ?? true);
        setAutoFreeTableOnPayment(data.autoFreeTableOnPayment ?? true);

        // Load invoice settings
        if (organizationId && token) {
          try {
            const invSettings = await invoicesApi.getSettings(token, organizationId);
            setInvoiceSettings(invSettings);
            setEnableInvoices(invSettings.enableInvoices);
            setGstEnabled(invSettings.gstEnabled);
            setInvoiceSettingsPrefix(invSettings.invoicePrefix);
            setInvoiceBranchPrefix(invSettings.invoiceBranchPrefix);
            setInvoiceResetCycle(invSettings.invoiceResetCycle);
            setInvoicePadding(invSettings.invoicePadding);
            setInvoiceDisplayFormat(invSettings.invoiceDisplayFormat);
            setIncludeLogo(invSettings.includeLogo);
          } catch {
            // Ignore invoice settings errors
          }
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unable to load settings.');
        }
      } finally {
        setLoadingSettings(false);
      }
    }
    loadSettings();
  }, [token, loading, user, organizationId]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await settingsApi.updateBusiness(
        token,
        {
          businessName: businessName || null,
          businessAddress: businessAddress || null,
          gstNumber: gstNumber || null,
          contactPhone: contactPhone || null,
          contactEmail: contactEmail || null,
        },
        logoFile || undefined,
      );
      setSettings(updated);
      setLogoFile(null);
      setSuccess('Business settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to update business settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBillingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await settingsApi.updateBilling(token, {
        taxRate,
        invoicePrefix,
        invoiceFooter: invoiceFooter || null,
        currency,
        defaultDiscountType,
      });
      setSettings(updated);
      setSuccess('Billing settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to update billing settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await settingsApi.updateInventory(token, {
        defaultLowStockThreshold,
        defaultUnit,
        stockWarningAlerts,
      });
      setSettings(updated);
      setSuccess('Inventory settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to update inventory settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInvoiceSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !organizationId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await invoicesApi.updateSettings(token, organizationId, {
        enableInvoices,
        gstEnabled,
        invoicePrefix: invoiceSettingsPrefix,
        invoiceBranchPrefix,
        invoiceResetCycle,
        invoicePadding,
        invoiceDisplayFormat,
        includeLogo,
      });
      setInvoiceSettings(updated);
      setSuccess('Invoice settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to update invoice settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTableSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await settingsApi.updateTable(token, {
        enableTables,
        enableReservations,
        allowTableMerge,
        autoFreeTableOnPayment,
      });
      setSettings(updated);
      setSuccess('Table settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to update table settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-700">Loading…</p>
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
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-zinc-900">Settings</h1>
          <p className="mt-2 text-sm text-zinc-700">
            Manage your business configuration
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-zinc-200">
          <button
            onClick={() => setActiveTab('business')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'business'
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-700 hover:text-zinc-900'
            }`}
          >
            Business
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'billing'
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-700 hover:text-zinc-900'
            }`}
          >
            Billing
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'inventory'
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-700 hover:text-zinc-900'
            }`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'invoices'
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-700 hover:text-zinc-900'
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'tables'
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-700 hover:text-zinc-900'
            }`}
          >
            Tables
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'support'
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-700 hover:text-zinc-900'
            }`}
          >
            Support
          </button>
        </div>

        {loadingSettings ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-zinc-700">Loading settings…</p>
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            {/* Business Settings */}
            {activeTab === 'business' && (
              <form onSubmit={handleBusinessSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-900">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                    placeholder="Your Business Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900">
                    Business Logo
                  </label>
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Business logo"
                      className="mb-2 h-24 w-24 rounded-lg object-cover"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="mt-1 block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900">
                    Business Address
                  </label>
                  <textarea
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                    placeholder="Street, City, State, ZIP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                    placeholder="GSTIN (optional)"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-900">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                      placeholder="+91 1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-900">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                      placeholder="contact@business.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Business Settings'}
                </button>
              </form>
            )}

            {/* Billing Settings */}
            {activeTab === 'billing' && (
              <form onSubmit={handleBillingSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-900">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-900">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                      placeholder="₹"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                    placeholder="INV-"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900">
                    Invoice Footer Text
                  </label>
                  <textarea
                    value={invoiceFooter}
                    onChange={(e) => setInvoiceFooter(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                    placeholder="Thank you for your business!"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900">
                    Default Discount Type
                  </label>
                  <select
                    value={defaultDiscountType}
                    onChange={(e) => setDefaultDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Billing Settings'}
                </button>
              </form>
            )}

            {/* Inventory Settings */}
            {activeTab === 'inventory' && (
              <form onSubmit={handleInventorySubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-900">
                      Default Low Stock Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={defaultLowStockThreshold}
                      onChange={(e) => setDefaultLowStockThreshold(parseInt(e.target.value, 10) || 0)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-900">
                      Default Unit
                    </label>
                    <input
                      type="text"
                      value={defaultUnit}
                      onChange={(e) => setDefaultUnit(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                      placeholder="unit"
                      maxLength={32}
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={stockWarningAlerts}
                      onChange={(e) => setStockWarningAlerts(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="text-sm font-medium text-zinc-900">
                      Enable Stock Warning Alerts
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-zinc-700">
                    Show alerts when products fall below the low stock threshold
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Inventory Settings'}
                </button>
              </form>
            )}

            {/* Invoice Settings */}
            {activeTab === 'invoices' && (
              <form onSubmit={handleInvoiceSettingsSubmit} className="space-y-6">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enableInvoices}
                      onChange={(e) => setEnableInvoices(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="text-sm font-medium text-zinc-900">
                      Enable Invoice Generation
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={gstEnabled}
                      onChange={(e) => setGstEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="text-sm font-medium text-zinc-900">
                      Enable GST/Tax on Invoices
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-900">
                      Invoice Prefix
                    </label>
                    <input
                      type="text"
                      value={invoiceSettingsPrefix}
                      onChange={(e) => setInvoiceSettingsPrefix(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                      placeholder="INV"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-900">
                      Serial Number Padding
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={invoicePadding}
                      onChange={(e) => setInvoicePadding(parseInt(e.target.value, 10) || 5)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900">
                    Invoice Reset Cycle
                  </label>
                  <select
                    value={invoiceResetCycle}
                    onChange={(e) => setInvoiceResetCycle(e.target.value as 'never' | 'monthly' | 'yearly')}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  >
                    <option value="never">Never (Continuous)</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900">
                    Invoice Display Format
                  </label>
                  <select
                    value={invoiceDisplayFormat}
                    onChange={(e) => setInvoiceDisplayFormat(e.target.value as 'A4' | 'thermal')}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  >
                    <option value="A4">A4</option>
                    <option value="thermal">Thermal</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={invoiceBranchPrefix}
                      onChange={(e) => setInvoiceBranchPrefix(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="text-sm font-medium text-zinc-900">
                      Include Branch Prefix in Invoice Number
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeLogo}
                      onChange={(e) => setIncludeLogo(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="text-sm font-medium text-zinc-900">
                      Include Business Logo on Invoices
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Invoice Settings'}
                </button>
              </form>
            )}

            {/* Table Settings */}
            {activeTab === 'tables' && (
              <form onSubmit={handleTableSettingsSubmit} className="space-y-6">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enableTables}
                      onChange={(e) => setEnableTables(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="text-sm font-medium text-zinc-900">
                      Enable Table Management
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-zinc-700">
                    Enable table tracking and assignment for your restaurant or café. When enabled, you can manage tables, assign orders to tables, and track table status.
                  </p>
                </div>

                {enableTables && (
                  <>
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={enableReservations}
                          onChange={(e) => setEnableReservations(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                        />
                        <span className="text-sm font-medium text-zinc-900">
                          Enable Reservations
                        </span>
                      </label>
                      <p className="mt-1 text-xs text-zinc-700">
                        Allow staff to reserve tables for future bookings (feature coming soon)
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={allowTableMerge}
                          onChange={(e) => setAllowTableMerge(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                        />
                        <span className="text-sm font-medium text-zinc-900">
                          Allow Table Merging
                        </span>
                      </label>
                      <p className="mt-1 text-xs text-zinc-700">
                        Allow staff to merge multiple tables together (e.g., when a large party needs adjacent tables)
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={autoFreeTableOnPayment}
                          onChange={(e) => setAutoFreeTableOnPayment(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                        />
                        <span className="text-sm font-medium text-zinc-900">
                          Auto-Free Table on Payment
                        </span>
                      </label>
                      <p className="mt-1 text-xs text-zinc-700">
                        Automatically set table status to "Cleaning" when the order is paid, so staff can prepare it for the next customer
                      </p>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Table Settings'}
                </button>
              </form>
            )}

            {/* Support */}
            {activeTab === 'support' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                    Contact Support
                  </h2>
                  <p className="text-sm text-zinc-700 mb-6">
                    Need help? Reach out to our support team using the contact information below.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-6 w-6 text-zinc-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-zinc-900 mb-1">
                          Phone
                        </h3>
                        <a
                          href="tel:+919324115782"
                          className="text-base text-zinc-700 hover:text-zinc-900 transition"
                        >
                          +91 9324115782
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-6 w-6 text-zinc-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-zinc-900 mb-1">
                          Email
                        </h3>
                        <a
                          href="mailto:prashin@ecommerse.com"
                          className="text-base text-zinc-700 hover:text-zinc-900 transition"
                        >
                          prashin@ecommerse.com
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
