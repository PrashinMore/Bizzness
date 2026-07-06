'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { productsApi, stockApi } from '@/lib/api-client';
import { Product, InventoryType } from '@/types/product';
import { Stock } from '@/types/stock';
import { PageEyebrow, PageHeader, PageShell, PageSubtitle, PageTitle } from '@/components/ui/shell';
import { getStockStatus, stockStatusBorder, stockStatusDot } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InlineAlert, LoadingState, EmptyState } from '@/components/ui/states';
import { RecipeEditor } from '@/components/recipe-editor';

type CreateProductState = {
  name: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  unit: string;
  lowStockThreshold: string;
  /**
   * Inventory behavior fields — default to the "SIMPLE, tracked" combo so
   * existing muscle memory for staff isn't disrupted. The UI hides fields
   * conditionally based on these two flags (see render section below).
   */
  trackInventory: boolean;
  inventoryType: InventoryType;
};

const blankProduct: CreateProductState = {
  name: '',
  category: '',
  costPrice: '',
  sellingPrice: '',
  unit: '',
  lowStockThreshold: '10',
  trackInventory: true,
  inventoryType: 'SIMPLE',
};

type FilterState = {
  search: string;
  category: string;
  lowStockOnly: boolean;
  /**
   * Client-side inventory-type filter. 'ALL' = no filter. 'SIMPLE' doubles as
   * the "raw materials only" view for kitchen staff — the usual pattern is
   * that raw ingredients are tracked SIMPLE, while menu dishes are RECIPE.
   */
  inventoryType: 'ALL' | InventoryType;
};

const initialFilters: FilterState = {
  search: '',
  category: '',
  lowStockOnly: false,
  inventoryType: 'ALL',
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

  // Recipe editor drawer state. We keep the whole product object (not just the
  // id) so the modal has the name/context for its header without re-lookup.
  const [recipeEditorProduct, setRecipeEditorProduct] = useState<Product | null>(null);

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
            trackInventory: product.trackInventory ?? true,
            inventoryType: product.inventoryType ?? 'SIMPLE',
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
    const timer = setTimeout(() => {
      setAppliedFilters(filters);
    }, filters.search.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    if (!loading && user && token) {
      loadProducts(appliedFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, token, appliedFilters]);

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
        trackInventory: createState.trackInventory,
        inventoryType: createState.inventoryType,
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
        trackInventory: form.trackInventory,
        inventoryType: form.inventoryType,
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
          trackInventory: updated.trackInventory ?? true,
          inventoryType: updated.inventoryType ?? 'SIMPLE',
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

  // Only SIMPLE, tracked products have a meaningful "low stock" signal — RECIPE
  // items derive availability from ingredients, NONE items have no stock row.
  const lowStockCount = useMemo(
    () => products.filter((product) => {
      const inventoryType = product.inventoryType ?? 'SIMPLE';
      const tracked = product.trackInventory ?? true;
      if (!tracked || inventoryType !== 'SIMPLE') {
        return false;
      }
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
      <main className="flex min-h-screen items-center justify-center bg-app">
        <p className="text-sm text-muted">Loading product dashboard…</p>
      </main>
    );
  }

  return (
    <PageShell className="py-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <PageHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <PageEyebrow>Inventory</PageEyebrow>
              <PageTitle className="mt-1">Product &amp; stock management</PageTitle>
              <PageSubtitle>
                Track costs, selling prices, and ensure you never run out of stock.
              </PageSubtitle>
            </div>
            <div className="grid gap-2 text-sm text-muted md:text-right">
              <p>
                <span className="tabular-data font-semibold text-ink">{products.length}</span>{' '}
                products
              </p>
              <p>
                <span className="tabular-data font-semibold text-ink">{lowStockCount}</span>{' '}
                at risk
              </p>
              <p>
                Inventory value:{' '}
                <span className="tabular-data font-semibold text-ink">
                  ₹{inventoryValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </p>
            </div>
          </div>
        </PageHeader>

        {/* CSV Bulk Import Section */}
        <Card>
          <CardTitle>Bulk Import Products</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Import multiple products at once using a CSV file. Existing products with the same name will be updated.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={handleDownloadTemplate}
              variant="secondary"
            >
              📥 Download Template
            </Button>
            <label className="flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition hover:bg-paper">
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
            <div className="mt-4 rounded-lg border border-border bg-paper p-4">
              <p className="text-sm font-medium text-ink">
                {importResult.created + importResult.updated} products processed
              </p>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted">Created:</span>{' '}
                  <span className="font-semibold text-green-600">{importResult.created}</span>
                </div>
                <div>
                  <span className="text-muted">Updated:</span>{' '}
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
        </Card>

        <section className="grid gap-6 md:grid-cols-2">
          <Card id="add-product-form">
            <CardTitle>Add a product</CardTitle>
            <p className="mt-1 text-sm text-muted">
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
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
              <input
                required
                placeholder="Category"
                value={createState.category}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, category: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
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
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
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
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                />
              </div>
              <input
                required
                placeholder="Unit (e.g. pcs, kg)"
                value={createState.unit}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, unit: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
              {createState.trackInventory && createState.inventoryType !== 'NONE' && (
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
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                />
              )}

              {/* Inventory behavior controls. `trackInventory` is the master switch
                  so services (e.g. a dine-in charge) can bypass stock logic entirely.
                  `inventoryType` decides how stock is deducted on sale. */}
              <label className="flex items-center gap-3 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={createState.trackInventory}
                  onChange={(event) =>
                    setCreateState((prev) => ({
                      ...prev,
                      trackInventory: event.target.checked,
                      inventoryType: event.target.checked ? prev.inventoryType : 'NONE',
                    }))
                  }
                  className="h-4 w-4 rounded border-border"
                />
                Track inventory for this product
              </label>
              {createState.trackInventory && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                    Inventory type
                  </label>
                  <select
                    value={createState.inventoryType}
                    onChange={(event) =>
                      setCreateState((prev) => ({
                        ...prev,
                        inventoryType: event.target.value as InventoryType,
                      }))
                    }
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                  >
                    <option value="SIMPLE">Simple – deduct this product from stock</option>
                    <option value="RECIPE">Recipe – deduct ingredients instead</option>
                    <option value="NONE">None – never deduct stock</option>
                  </select>
                  {createState.inventoryType === 'RECIPE' && (
                    <p className="mt-2 text-xs text-muted">
                      You&apos;ll be able to attach a recipe after the product is saved.
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
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
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                />
                {createImagePreview && (
                  <div className="mt-2">
                    <img
                      src={createImagePreview}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-lg border border-border"
                    />
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={creating}
              >
                {creating ? 'Saving…' : 'Add Product'}
              </Button>
            </form>
          </Card>

          <Card>
            <CardTitle>
              Search & filters
            </CardTitle>
            <div className="mt-4 space-y-4">
              <input
                type="search"
                placeholder="Search by name"
                aria-label="Search products by name"
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, search: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
              <select
                value={filters.category}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, category: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-3 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={filters.lowStockOnly}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      lowStockOnly: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-border text-ink focus:ring-accent"
                />
                Show only low-stock items
              </label>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Inventory type
                </label>
                <select
                  value={filters.inventoryType}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      inventoryType: event.target.value as 'ALL' | InventoryType,
                    }))
                  }
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <option value="ALL">All products</option>
                  <option value="SIMPLE">Raw materials (simple)</option>
                  <option value="RECIPE">Recipe dishes</option>
                  <option value="NONE">Not tracked</option>
                </select>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setFilters(initialFilters);
                    setAppliedFilters(initialFilters);
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  Clear filters
                </Button>
              </div>
            </div>
          </Card>
        </section>

        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Inventory overview</CardTitle>
            <span className="text-sm text-muted">
              {fetching ? 'Refreshing…' : `${products.length} items`}
            </span>
          </div>

          {statusMessage ? (
            <InlineAlert tone="success" className="mt-4">
              {statusMessage}
            </InlineAlert>
          ) : null}

          {error ? (
            <InlineAlert className="mt-4">
              {error}
            </InlineAlert>
          ) : null}

          <div className="mt-6 space-y-4">
            {fetching ? (
              <LoadingState message="Loading products…" className="justify-start py-2" />
            ) : products.length === 0 ? (
              <EmptyState
                title="No items yet"
                description="Add your first product to start tracking stock levels and costs."
                actionLabel="Add Product"
                onAction={() => {
                  document.getElementById('add-product-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            ) : (
              products
                .filter((product) => {
                  if (appliedFilters.inventoryType !== 'ALL') {
                    const invType = product.inventoryType ?? 'SIMPLE';
                    if (invType !== appliedFilters.inventoryType) {
                      return false;
                    }
                  }
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
                  trackInventory: product.trackInventory ?? true,
                  inventoryType: product.inventoryType ?? 'SIMPLE',
                };
                const inventoryType: InventoryType = form.inventoryType ?? 'SIMPLE';
                const trackInventory = form.trackInventory ?? true;
                const isEditing = editingProductId === product.id;
                const deltaValue = adjustInputs[product.id] ?? '';
                const stockStatus =
                  inventoryType === 'SIMPLE' && trackInventory
                    ? getStockStatus(stockQuantity, product.lowStockThreshold, true)
                    : 'untracked';
                const lowStock = stockStatus === 'low' || stockStatus === 'out';
                const profitPerUnit = Number(product.sellingPrice) - Number(product.costPrice);
                return (
                  <div
                    key={product.id}
                    className={`rounded-panel border border-border border-l-4 bg-surface p-4 shadow-soft ${stockStatusBorder[stockStatus]}`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex gap-4">
                        {product.imageUrl && (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${product.imageUrl}`}
                            alt={product.name}
                            className="h-20 w-20 object-cover rounded-lg border border-border flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${stockStatusDot[stockStatus]}`}
                              aria-hidden="true"
                            />
                            <h3 className="text-base font-semibold text-ink">
                              {product.name}
                            </h3>
                            {stockStatus === 'low' ? (
                              <Badge variant="warning">Low stock</Badge>
                            ) : stockStatus === 'out' ? (
                              <Badge variant="danger">Out of stock</Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted">{product.category}</p>
                          <p className="text-xs text-muted">
                            Added {new Date(product.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted">
                        {/* Stock display branches on the inventory type so the card
                            stays honest — showing "0 in stock" for a RECIPE dish
                            is confusing because its "stock" is derived from
                            ingredients, not this row. */}
                        {inventoryType === 'SIMPLE' && trackInventory && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted">
                              In stock
                            </p>
                            <p className="font-semibold text-ink">
                              {stockQuantity} {product.unit}
                            </p>
                          </div>
                        )}
                        {inventoryType === 'RECIPE' && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted">
                              Inventory
                            </p>
                            <p className="font-semibold text-brand-700">Recipe-driven</p>
                          </div>
                        )}
                        {(inventoryType === 'NONE' || !trackInventory) && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted">
                              Inventory
                            </p>
                            <p className="font-semibold text-muted">Not tracked</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted">
                            Cost / Sell
                          </p>
                          <p className="font-semibold text-ink">
                            ${Number(product.costPrice).toFixed(2)} / $
                            {Number(product.sellingPrice).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted">
                            Profit / unit
                          </p>
                          <p className="font-semibold text-ink">
                            ${profitPerUnit.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {inventoryType === 'RECIPE' && (
                          <Button
                            onClick={() => setRecipeEditorProduct(product)}
                            variant="secondary"
                            size="sm"
                          >
                            Manage recipe
                          </Button>
                        )}
                        <Button
                          onClick={() =>
                            setEditingProductId((prev) =>
                              prev === product.id ? null : product.id,
                            )
                          }
                          variant="secondary"
                          size="sm"
                        >
                          {isEditing ? 'Close' : 'Edit'}
                        </Button>
                        <Button
                          onClick={() => handleDelete(product.id)}
                          variant="danger"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Quick stock adjust is only meaningful when this row itself
                        is the stock-keeping unit. For RECIPE dishes, stock lives
                        on the ingredients; for NONE, there is no stock at all. */}
                    {inventoryType === 'SIMPLE' && trackInventory && (
                      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-medium uppercase tracking-wide text-muted">
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
                              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                            />
                            <div className="flex gap-1">
                              {/* Fast numeric presets — faster than typing for
                                  bulk deliveries of common SKUs. */}
                              {[1, 5, 10].map((preset) => (
                                <Button
                                  key={preset}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setAdjustInputs((prev) => ({
                                      ...prev,
                                      [product.id]: String(
                                        (Number(prev[product.id]) || 0) + preset,
                                      ),
                                    }))
                                  }
                                >
                                  +{preset}
                                </Button>
                              ))}
                            </div>
                            <Button
                              type="button"
                              onClick={() => handleAdjustStock(product.id)}
                              disabled={adjusting[product.id]}
                              variant="secondary"
                              size="sm"
                            >
                              {adjusting[product.id] ? 'Updating…' : 'Apply'}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted">
                            Low stock threshold
                          </p>
                          <p className="text-sm font-semibold text-ink">
                            {product.lowStockThreshold} {product.unit}
                          </p>
                        </div>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <input
                          value={form.name}
                          onChange={(event) =>
                            handleEditChange(product.id, 'name', event.target.value)
                          }
                          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                        />
                        <input
                          value={form.category}
                          onChange={(event) =>
                            handleEditChange(product.id, 'category', event.target.value)
                          }
                          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.costPrice}
                          onChange={(event) =>
                            handleEditChange(product.id, 'costPrice', event.target.value)
                          }
                          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.sellingPrice}
                          onChange={(event) =>
                            handleEditChange(product.id, 'sellingPrice', event.target.value)
                          }
                          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                        />
                        <input
                          value={form.unit}
                          onChange={(event) =>
                            handleEditChange(product.id, 'unit', event.target.value)
                          }
                          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
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
                          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                        />
                        <label className="flex items-center gap-3 text-sm text-muted md:col-span-2">
                          <input
                            type="checkbox"
                            checked={form.trackInventory}
                            onChange={(event) =>
                              setEditForms((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  trackInventory: event.target.checked,
                                  inventoryType: event.target.checked
                                    ? prev[product.id].inventoryType
                                    : 'NONE',
                                },
                              }))
                            }
                            className="h-4 w-4 rounded border-border"
                          />
                          Track inventory for this product
                        </label>
                        {form.trackInventory && (
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                              Inventory type
                            </label>
                            <div className="flex gap-3">
                              <select
                                value={form.inventoryType}
                                onChange={(event) =>
                                  setEditForms((prev) => ({
                                    ...prev,
                                    [product.id]: {
                                      ...prev[product.id],
                                      inventoryType: event.target.value as InventoryType,
                                    },
                                  }))
                                }
                                className="flex-1 rounded-xl border border-border px-3 py-2 text-sm"
                              >
                                <option value="SIMPLE">
                                  Simple – deduct this product
                                </option>
                                <option value="RECIPE">
                                  Recipe – deduct ingredients
                                </option>
                                <option value="NONE">None – never deduct</option>
                              </select>
                              {form.inventoryType === 'RECIPE' && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setRecipeEditorProduct(product)}
                                >
                                  Manage recipe
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-muted mb-2">
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
                            className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                          />
                          {(editImagePreviews[product.id] || product.imageUrl) && (
                            <div className="mt-2">
                              <img
                                src={
                                  editImagePreviews[product.id] ||
                                  `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${product.imageUrl}`
                                }
                                alt="Preview"
                                className="h-32 w-32 object-cover rounded-lg border border-border"
                              />
                            </div>
                          )}
                        </div>
                        <div className="md:col-span-2 flex gap-3">
                          <Button
                            onClick={() => handleUpdate(product.id)}
                            disabled={saving}
                            className="flex-1"
                          >
                            {saving ? 'Saving…' : 'Save changes'}
                          </Button>
                          <Button
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
                                  trackInventory: product.trackInventory ?? true,
                                  inventoryType: product.inventoryType ?? 'SIMPLE',
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
                            variant="secondary"
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Recipe editor drawer — mounted at the page level so it overlays the
          whole dashboard regardless of which row triggered it. We refresh the
          product list on close so any inventoryType flips performed by the
          backend (e.g. first recipe auto-sets inventoryType='RECIPE') show up. */}
      {recipeEditorProduct && (
        <RecipeEditor
          open={Boolean(recipeEditorProduct)}
          onClose={() => {
            setRecipeEditorProduct(null);
            loadProducts(appliedFilters);
          }}
          token={token}
          product={recipeEditorProduct}
          allProducts={products}
          outletId={
            typeof window !== 'undefined'
              ? localStorage.getItem('selected-outlet-id')
              : null
          }
          onSaved={() => {
            loadProducts(appliedFilters);
          }}
        />
      )}
    </PageShell>
  );
}

