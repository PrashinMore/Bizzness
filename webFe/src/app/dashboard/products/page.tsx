'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { productsApi, stockApi } from '@/lib/api-client';
import { Product } from '@/types/product';
import { Stock } from '@/types/stock';

type CreateProductState = {
  name: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  unit: string;
  lowStockThreshold: string;
};

const blankProduct: CreateProductState = {
  name: '',
  category: '',
  costPrice: '',
  sellingPrice: '',
  unit: '',
  lowStockThreshold: '10',
};

type FilterState = {
  search: string;
  category: string;
  lowStockOnly: boolean;
};

const initialFilters: FilterState = {
  search: '',
  category: '',
  lowStockOnly: false,
};

export default function ProductsPage() {
  const { user, loading } = useRequireAuth('admin');
  const { token } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<Map<string, Stock>>(new Map());
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilters);

  const [createState, setCreateState] = useState<CreateProductState>(blankProduct);
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editForms, setEditForms] = useState<Record<string, CreateProductState>>({});
  const [editImageFiles, setEditImageFiles] = useState<Record<string, File | null>>({});
  const [editImagePreviews, setEditImagePreviews] = useState<Record<string, string | null>>({});
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [adjustInputs, setAdjustInputs] = useState<Record<string, string>>({});
  const [adjusting, setAdjusting] = useState<Record<string, boolean>>({});

  // CSV bulk import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    errors: Array<{ row: number; error: string }>;
    totalProcessed: number;
  } | null>(null);

  const loadProducts = async (activeFilters: FilterState) => {
    if (!token) {
      return;
    }
    setFetching(true);
    setError(null);
    try {
      const data = await productsApi.list(token, {
        search: activeFilters.search.trim() || undefined,
        category: activeFilters.category || undefined,
      });
      setProducts(data);

      // Get outlet ID from localStorage
      const outletId = typeof window !== 'undefined' ? localStorage.getItem('selected-outlet-id') : null;
      
      // Load stock for all products if outlet is selected
      if (outletId && data.length > 0) {
        try {
          const productIds = data.map(p => p.id);
          const stockData = await stockApi.getForOutlet(token, outletId, productIds);
          const stockMap = new Map<string, Stock>();
          stockData.forEach(stock => {
            stockMap.set(stock.productId, stock);
          });
          setStocks(stockMap);
        } catch (stockErr) {
          console.warn('Failed to load stock:', stockErr);
          // Continue without stock data
        }
      }

      const mapped = Object.fromEntries(
        data.map((product) => [
          product.id,
          {
            name: product.name,
            category: product.category,
            costPrice: product.costPrice.toString(),
            sellingPrice: product.sellingPrice.toString(),
            unit: product.unit,
            lowStockThreshold: product.lowStockThreshold.toString(),
          },
        ]),
      );
      setEditForms(mapped);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load products.');
      }
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && user && token) {
      loadProducts(appliedFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, token, appliedFilters]);

  const handleFiltersSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }
    setCreating(true);
    setStatusMessage(null);
    setError(null);

    try {
      const payload = {
        name: createState.name.trim(),
        category: createState.category.trim(),
        costPrice: Number(createState.costPrice),
        sellingPrice: Number(createState.sellingPrice),
        unit: createState.unit.trim(),
        lowStockThreshold: Number(createState.lowStockThreshold || '0'),
        imageUrl: null,
      };
      const created = await productsApi.create(token, payload, createImageFile || undefined);
      setProducts((prev) => [created, ...prev]);
      setCreateState(blankProduct);
      setCreateImageFile(null);
      setCreateImagePreview(null);
      setStatusMessage(`Product "${created.name}" added.`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to create product.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleEditChange = (
    id: string,
    field: keyof CreateProductState,
    value: string,
  ) => {
    setEditForms((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleUpdate = async (id: string) => {
    if (!token) {
      return;
    }
    const form = editForms[id];
    if (!form) {
      return;
    }
    setSaving(true);
    setStatusMessage(null);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        unit: form.unit.trim(),
        lowStockThreshold: Number(form.lowStockThreshold),
      };
      const updated = await productsApi.update(token, id, payload, editImageFiles[id] || undefined);
      setProducts((prev) =>
        prev.map((product) => (product.id === id ? updated : product)),
      );
      setEditForms((prev) => ({
        ...prev,
        [id]: {
          name: updated.name,
          category: updated.category,
          costPrice: updated.costPrice.toString(),
          sellingPrice: updated.sellingPrice.toString(),
          unit: updated.unit,
          lowStockThreshold: updated.lowStockThreshold.toString(),
        },
      }));
      setEditImageFiles((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setEditImagePreviews((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setEditingProductId(null);
      setStatusMessage(`Product "${updated.name}" updated.`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to update product.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) {
      return;
    }
    const target = products.find((product) => product.id === id);
    if (!target) {
      return;
    }
    const confirmed = window.confirm(
      `Delete product “${target.name}”? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }
    setError(null);
    setStatusMessage(null);
    try {
      await productsApi.remove(token, id);
      setProducts((prev) => prev.filter((product) => product.id !== id));
      setStatusMessage(`Product “${target.name}” removed.`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to delete product.');
      }
    }
  };

  const handleAdjustStock = async (id: string) => {
    if (!token) {
      return;
    }
    const outletId = typeof window !== 'undefined' ? localStorage.getItem('selected-outlet-id') : null;
    if (!outletId) {
      setError('Please select an outlet to adjust stock.');
      return;
    }
    const deltaValue = adjustInputs[id];
    if (!deltaValue) {
      return;
    }
    const delta = Number(deltaValue);
    if (Number.isNaN(delta) || delta === 0) {
      return;
    }
    setAdjusting((prev) => ({ ...prev, [id]: true }));
    setStatusMessage(null);
    setError(null);
    try {
      const updatedStock = await stockApi.adjustStock(token, id, delta);
      const product = products.find(p => p.id === id);
      setStocks((prev) => {
        const next = new Map(prev);
        next.set(id, updatedStock);
        return next;
      });
      setAdjustInputs((prev) => ({ ...prev, [id]: '' }));
      setStatusMessage(
        `Stock for "${product?.name || 'product'}" ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}.`,
      );
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to adjust stock.');
      }
    } finally {
      setAdjusting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).filter(Boolean),
    [products],
  );

  const lowStockCount = useMemo(
    () => products.filter((product) => {
      const stock = stocks.get(product.id);
      const stockQuantity = stock?.quantity ?? 0;
      return stockQuantity < product.lowStockThreshold;
    }).length,
    [products, stocks],
  );

  const inventoryValue = useMemo(
    () =>
      products.reduce(
        (sum, product) => {
          const stock = stocks.get(product.id);
          const stockQuantity = stock?.quantity ?? 0;
          return sum + stockQuantity * Number(product.costPrice);
        },
        0,
      ),
    [products, stocks],
  );

  const handleDownloadTemplate = async () => {
    if (!token) return;
    try {
      const blob = await productsApi.downloadTemplate(token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setStatusMessage('Template downloaded successfully');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to download template');
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    setImporting(true);
    setError(null);
    setStatusMessage(null);
    setImportResult(null);

    try {
      const result = await productsApi.bulkImport(token, file);
      setImportResult(result);
      setStatusMessage(result.message);
      
      // Reload products to show updates
      await loadProducts(appliedFilters);
      
      // Clear file input
      event.target.value = '';
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to import products');
      }
    } finally {
      setImporting(false);
    }
  };

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-700">Loading product dashboard…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-zinc-700">
                Inventory
              </p>
              <h1 className="text-3xl font-semibold text-zinc-900">
                Product & stock managementsss
              </h1>
              <p className="mt-2 text-sm text-zinc-700">
                Track costs, selling prices, and ensure you never run out of stock.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-zinc-700 md:text-right">
              <p>
                <span className="font-semibold text-zinc-900">{products.length}</span>{' '}
                products
              </p>
              <p>
                <span className="font-semibold text-zinc-900">
                  {lowStockCount}
                </span>{' '}
                at risk
              </p>
              <p>
                Inventory value:{' '}
                <span className="font-semibold text-zinc-900">
                  ${inventoryValue.toFixed(2)}
                </span>
              </p>
            </div>
          </div>
        </header>

        {/* CSV Bulk Import Section */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Bulk Import Products</h2>
          <p className="mt-1 text-sm text-zinc-700">
            Import multiple products at once using a CSV file. Existing products with the same name will be updated.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              📥 Download Template
            </button>
            <label className="flex cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={importing}
                className="hidden"
              />
              {importing ? '⏳ Uploading...' : '📤 Upload CSV'}
            </label>
          </div>
          {importResult && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-medium text-zinc-900">
                {importResult.created + importResult.updated} products processed
              </p>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-600">Created:</span>{' '}
                  <span className="font-semibold text-green-600">{importResult.created}</span>
                </div>
                <div>
                  <span className="text-zinc-600">Updated:</span>{' '}
                  <span className="font-semibold text-blue-600">{importResult.updated}</span>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-red-600">
                    {importResult.errors.length} error(s) found:
                  </p>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-red-600">
                    {importResult.errors.map((error, i) => (
                      <li key={i}>
                        Row {error.row}: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Add a product</h2>
            <p className="mt-1 text-sm text-zinc-700">
              Create new SKUs with costs, selling price, and stock thresholds.
            </p>
            <form className="mt-4 grid gap-4" onSubmit={handleCreate}>
              <input
                required
                placeholder="Product name"
                value={createState.name}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
              <input
                required
                placeholder="Category"
                value={createState.category}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, category: event.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Cost price"
                  value={createState.costPrice}
                  onChange={(event) =>
                    setCreateState((prev) => ({ ...prev, costPrice: event.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Selling price"
                  value={createState.sellingPrice}
                  onChange={(event) =>
                    setCreateState((prev) => ({
                      ...prev,
                      sellingPrice: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
              </div>
              <input
                required
                placeholder="Unit (e.g. pcs, kg)"
                value={createState.unit}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, unit: event.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
              <input
                type="number"
                min="0"
                placeholder="Low stock warning threshold"
                value={createState.lowStockThreshold}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    lowStockThreshold: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Product Image (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setCreateImageFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCreateImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    } else {
                      setCreateImageFile(null);
                      setCreateImagePreview(null);
                    }
                  }}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
                {createImagePreview && (
                  <div className="mt-2">
                    <img
                      src={createImagePreview}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-lg border border-zinc-200"
                    />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={creating}
                className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? 'Saving…' : 'Add product'}
              </button>
            </form>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Search & filters
            </h2>
            <form className="mt-4 space-y-4" onSubmit={handleFiltersSubmit}>
              <input
                placeholder="Search by name"
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, search: event.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
              <select
                value={filters.category}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, category: event.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-3 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={filters.lowStockOnly}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      lowStockOnly: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                />
                Show only low-stock items
              </label>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-zinc-900 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-zinc-700"
                >
                  Apply filters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilters(initialFilters);
                    setAppliedFilters(initialFilters);
                  }}
                  className="flex-1 rounded-full border border-zinc-200 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
                >
                  Reset
                </button>
              </div>
            </form>
          </article>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              Inventory overview
            </h2>
            <span className="text-sm text-zinc-700">
              {fetching ? 'Refreshing…' : `${products.length} items`}
            </span>
          </div>

          {statusMessage ? (
            <p className="mt-4 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
              {statusMessage}
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <div className="mt-6 space-y-4">
            {fetching ? (
              <p className="text-sm text-zinc-700">Loading products…</p>
            ) : products.length === 0 ? (
              <p className="text-sm text-zinc-700">
                No products found. Create one using the form above.
              </p>
            ) : (
              products
                .filter((product) => {
                  if (!appliedFilters.lowStockOnly) return true;
                  const stock = stocks.get(product.id);
                  const stockQuantity = stock?.quantity ?? 0;
                  return stockQuantity < product.lowStockThreshold;
                })
                .map((product) => {
                const stock = stocks.get(product.id);
                const stockQuantity = stock?.quantity ?? 0;
                const form = editForms[product.id] ?? {
                  name: product.name,
                  category: product.category,
                  costPrice: product.costPrice.toString(),
                  sellingPrice: product.sellingPrice.toString(),
                  unit: product.unit,
                  lowStockThreshold: product.lowStockThreshold.toString(),
                };
                const isEditing = editingProductId === product.id;
                const deltaValue = adjustInputs[product.id] ?? '';
                const lowStock = stockQuantity < product.lowStockThreshold;
                const profitPerUnit = Number(product.sellingPrice) - Number(product.costPrice);
                return (
                  <div
                    key={product.id}
                    className={`rounded-2xl border p-4 shadow-sm ${
                      lowStock ? 'border-amber-200 bg-amber-50/40' : 'border-zinc-100 bg-white'
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex gap-4">
                        {product.imageUrl && (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${product.imageUrl}`}
                            alt={product.name}
                            className="h-20 w-20 object-cover rounded-lg border border-zinc-200 flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-zinc-900">
                              {product.name}
                            </h3>
                            {lowStock ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                Low stock
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm text-zinc-700">{product.category}</p>
                          <p className="text-xs text-zinc-700">
                            Added {new Date(product.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-zinc-600">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-zinc-700">
                            In stock
                          </p>
                          <p className="font-semibold text-zinc-900">
                            {stockQuantity} {product.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-zinc-700">
                            Cost / Sell
                          </p>
                          <p className="font-semibold text-zinc-900">
                            ${Number(product.costPrice).toFixed(2)} / $
                            {Number(product.sellingPrice).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-zinc-700">
                            Profit / unit
                          </p>
                          <p className="font-semibold text-zinc-900">
                            ${profitPerUnit.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setEditingProductId((prev) =>
                              prev === product.id ? null : product.id,
                            )
                          }
                          className="rounded-full border border-zinc-200 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
                        >
                          {isEditing ? 'Close' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="rounded-full border border-red-200 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:border-red-400 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-700">
                          Adjust stock
                        </label>
                        <div className="mt-2 flex gap-3">
                          <input
                            type="number"
                            value={deltaValue}
                            onChange={(event) =>
                              setAdjustInputs((prev) => ({
                                ...prev,
                                [product.id]: event.target.value,
                              }))
                            }
                            placeholder="+/- units"
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(product.id)}
                            disabled={adjusting[product.id]}
                            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {adjusting[product.id] ? 'Updating…' : 'Apply'}
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-700">
                          Low stock threshold
                        </p>
                        <p className="text-sm font-semibold text-zinc-900">
                          {product.lowStockThreshold} {product.unit}
                        </p>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <input
                          value={form.name}
                          onChange={(event) =>
                            handleEditChange(product.id, 'name', event.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                        />
                        <input
                          value={form.category}
                          onChange={(event) =>
                            handleEditChange(product.id, 'category', event.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.costPrice}
                          onChange={(event) =>
                            handleEditChange(product.id, 'costPrice', event.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.sellingPrice}
                          onChange={(event) =>
                            handleEditChange(product.id, 'sellingPrice', event.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                        />
                        <input
                          value={form.unit}
                          onChange={(event) =>
                            handleEditChange(product.id, 'unit', event.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                        />
                        <input
                          type="number"
                          min="0"
                          value={form.lowStockThreshold}
                          onChange={(event) =>
                            handleEditChange(
                              product.id,
                              'lowStockThreshold',
                              event.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                        />
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-zinc-700 mb-2">
                            Product Image (optional)
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                setEditImageFiles((prev) => ({ ...prev, [product.id]: file }));
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEditImagePreviews((prev) => ({
                                    ...prev,
                                    [product.id]: reader.result as string,
                                  }));
                                };
                                reader.readAsDataURL(file);
                              } else {
                                setEditImageFiles((prev) => {
                                  const next = { ...prev };
                                  delete next[product.id];
                                  return next;
                                });
                                setEditImagePreviews((prev) => {
                                  const next = { ...prev };
                                  delete next[product.id];
                                  return next;
                                });
                              }
                            }}
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                          />
                          {(editImagePreviews[product.id] || product.imageUrl) && (
                            <div className="mt-2">
                              <img
                                src={
                                  editImagePreviews[product.id] ||
                                  `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${product.imageUrl}`
                                }
                                alt="Preview"
                                className="h-32 w-32 object-cover rounded-lg border border-zinc-200"
                              />
                            </div>
                          )}
                        </div>
                        <div className="md:col-span-2 flex gap-3">
                          <button
                            onClick={() => handleUpdate(product.id)}
                            disabled={saving}
                            className="flex-1 rounded-full bg-zinc-900 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {saving ? 'Saving…' : 'Save changes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProductId(null);
                              setEditForms((prev) => ({
                                ...prev,
                                [product.id]: {
                                  name: product.name,
                                  category: product.category,
                                  costPrice: product.costPrice.toString(),
                                  sellingPrice: product.sellingPrice.toString(),
                                  unit: product.unit,
                                  lowStockThreshold: product.lowStockThreshold.toString(),
                                },
                              }));
                              setEditImageFiles((prev) => {
                                const next = { ...prev };
                                delete next[product.id];
                                return next;
                              });
                              setEditImagePreviews((prev) => {
                                const next = { ...prev };
                                delete next[product.id];
                                return next;
                              });
                            }}
                            className="flex-1 rounded-full border border-zinc-200 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

