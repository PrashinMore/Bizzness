'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { productsApi, salesApi, tablesApi, settingsApi } from '@/lib/api-client';
import type { Product } from '@/types/product';
import type { DiningTable, Sale } from '@/types/table';
import { useRouter } from 'next/navigation';

type CartItem = {
  productId: string;
  product: Product;
  quantity: number;
  sellingPrice: number;
};

export default function MenuPage() {
  const { user, loading } = useRequireAuth();
  const { token } = useAuth();
  const router = useRouter();

  const [allMenuItems, setAllMenuItems] = useState<Product[]>([]);
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<string>('cash');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [tablesEnabled, setTablesEnabled] = useState(false);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [activeSale, setActiveSale] = useState<Sale | null>(null);
  const [loadingActiveSale, setLoadingActiveSale] = useState(false);

  // Get unique categories from all menu items for the filter dropdown
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    allMenuItems.forEach((product) => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    return Array.from(categories).sort();
  }, [allMenuItems]);

  // Load settings and tables
  useEffect(() => {
    async function loadSettingsAndTables() {
      if (!token) return;
      try {
        const settings = await settingsApi.get(token);
        setTablesEnabled(settings.enableTables);
        
        if (settings.enableTables) {
          try {
            const tablesData = await tablesApi.list(token);
            setTables(tablesData);
          } catch (err) {
            console.error('Failed to load tables:', err);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }

    if (!loading && user && token) {
      loadSettingsAndTables();
    }
  }, [loading, user, token]);

  // Load all menu items initially to populate category dropdown
  useEffect(() => {
    async function loadAllProducts() {
      if (!token) {
        return;
      }
      try {
        // Load all menu items (without filters) to get available categories
        const data = await productsApi.list(token, { forMenu: true });
        setAllMenuItems(data);
      } catch (err) {
        // Silent fail for category dropdown - we'll show error when loading filtered items
      }
    }

    if (!loading && user && token) {
      loadAllProducts();
    }
  }, [loading, user, token]);

  // Check for tableId in URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tableIdFromUrl = params.get('tableId');
      if (tableIdFromUrl && tableIdFromUrl !== selectedTableId) {
        setSelectedTableId(tableIdFromUrl);
      }
    }
  }, []);

  // Load active sale when table is selected
  useEffect(() => {
    async function loadActiveSale() {
      if (!token || !selectedTableId) {
        setActiveSale(null);
        return;
      }

      setLoadingActiveSale(true);
      try {
        const sale = await tablesApi.getActiveSale(token, selectedTableId);
        setActiveSale(sale || null);
        if (sale) {
          // Don't load existing items into cart - let user add new items
          // Just show the active sale info
          setPaymentType(sale.paymentType || 'cash');
          setIsPaid(sale.isPaid);
          // Clear cart so user can add new items
          setCart([]);
        } else {
          // No active sale, clear cart
          setCart([]);
          setPaymentType('cash');
          setIsPaid(false);
        }
      } catch (err) {
        console.error('Failed to load active sale:', err);
        setActiveSale(null);
      } finally {
        setLoadingActiveSale(false);
      }
    }

    loadActiveSale();
  }, [token, selectedTableId]);

  // Load filtered menu items from backend
  useEffect(() => {
    async function loadProducts() {
      if (!token) {
        return;
      }
      setFetching(true);
      setError(null);
      try {
        // Use forMenu=true to exclude raw material categories
        // Include search and category filters
        const filters: { forMenu: boolean; search?: string; category?: string } = {
          forMenu: true,
        };
        if (searchQuery.trim()) {
          filters.search = searchQuery.trim();
        }
        if (categoryFilter.trim()) {
          filters.category = categoryFilter.trim();
        }
        const data = await productsApi.list(token, filters);
        setMenuItems(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unable to load menu items.');
        }
      } finally {
        setFetching(false);
      }
    }

    if (!loading && user && token) {
      loadProducts();
    }
  }, [loading, user, token, searchQuery, categoryFilter]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          product,
          quantity: 1,
          sellingPrice: Number(product.sellingPrice),
        },
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const numQuantity = Number(quantity) || 0;
    if (numQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: numQuantity } : item,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const totalAmount = useMemo(() => {
    const total = cart.reduce(
      (sum, item) => {
        const price = Number(item.sellingPrice) || 0;
        const qty = Number(item.quantity) || 0;
        return sum + price * qty;
      },
      0,
    );
    return total;
  }, [cart]);

  const handleCheckout = async () => {
    if (!token || !user || cart.length === 0) {
      return;
    }

    setCheckingOut(true);
    setError(null);

    try {
      // If there's an active sale, add items to it; otherwise create new sale
      if (activeSale) {
        // Only add items that are new or different from existing items
        // Compare by productId, quantity, and sellingPrice
        const existingProductIds = new Set(
          activeSale.items.map((si) => `${si.productId}-${si.quantity}-${si.sellingPrice}`)
        );
        
        // All items in cart are new items to be added
        const newItems = cart.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity) || 0,
          sellingPrice: Number(item.sellingPrice) || 0,
        }));

        if (newItems.length === 0) {
          // No new items to add, just navigate to sale
          router.push(`/sales/${activeSale.id}`);
          return;
        }

        await salesApi.addItems(token, activeSale.id, newItems);
        
        // Reload active sale to get updated total
        if (selectedTableId) {
          const refreshed = await tablesApi.getActiveSale(token, selectedTableId);
          if (refreshed) {
            setActiveSale(refreshed);
          }
        }
        
        setCart([]);
        router.push(`/sales/${activeSale.id}`);
      } else {
        // Create new sale
        const payload = {
          date: new Date().toISOString(),
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity) || 0,
            sellingPrice: Number(item.sellingPrice) || 0,
          })),
          totalAmount: Number(totalAmount.toFixed(2)),
          soldBy: user.id,
          paymentType: paymentType,
          isPaid: isPaid,
          tableId: selectedTableId || undefined,
        };

        const created = await salesApi.create(token, payload);
        setCart([]);
        setSelectedTableId('');
        setActiveSale(null);
        router.push(`/sales/${created.id}`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to complete checkout.');
      }
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-700">Loading menu…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:flex-row">
        {/* Menu Items Grid */}
        <div className="flex-1">
          <header className="mb-6">
            <h1 className="text-3xl font-semibold text-zinc-900">Menu</h1>
            <p className="mt-2 text-sm text-zinc-700">
              Select items to add to your cart
            </p>
          </header>

          {/* Search and Filter Controls */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                <option value="">All Categories</option>
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            {(searchQuery || categoryFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('');
                }}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Clear
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {fetching ? (
            <p className="text-sm text-zinc-700">Loading menu items…</p>
          ) : menuItems.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 shadow-sm">
              <p className="text-sm text-zinc-700">
                {searchQuery || categoryFilter
                  ? 'No menu items found matching your filters.'
                  : 'No menu items found. Add products to see them here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {menuItems.map((product) => {
                const inCart = cart.find((item) => item.productId === product.id);
                const cartQuantity = inCart?.quantity || 0;
                const isOutOfStock = product.stock <= 0;

                return (
                  <div
                    key={product.id}
                    className={`rounded-2xl bg-white p-3 sm:p-6 shadow-sm transition hover:shadow-md ${
                      isOutOfStock ? 'opacity-60' : ''
                    }`}
                  >
                    {product.imageUrl ? (
                      <div className="mb-3 sm:mb-4 aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl bg-zinc-100">
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${product.imageUrl}`}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="mb-3 sm:mb-4 aspect-square w-full rounded-xl sm:rounded-2xl bg-zinc-100 flex items-center justify-center">
                        <span className="text-zinc-700 text-xs sm:text-sm">No image</span>
                      </div>
                    )}

                    <h3 className="text-sm sm:text-lg font-semibold text-zinc-900 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-700 line-clamp-1">
                      {product.category}
                    </p>

                    <div className="mt-3 sm:mt-4">
                      <div className="mb-2 sm:mb-3">
                        <p className="text-base sm:text-2xl font-bold text-zinc-900">
                          ₹{Number(product.sellingPrice).toFixed(2)}
                        </p>
                        {product.stock > 0 && (
                          <p className="text-xs text-zinc-700">
                            {product.stock} in stock
                          </p>
                        )}
                        {isOutOfStock && (
                          <p className="text-xs text-red-500">Out of stock</p>
                        )}
                      </div>

                      <div className="flex items-center justify-center sm:justify-start">
                        {isOutOfStock ? (
                          <button
                            disabled
                            className="w-full sm:w-auto rounded-full border border-zinc-200 px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold text-zinc-700 cursor-not-allowed"
                          >
                            Out of Stock
                          </button>
                        ) : cartQuantity > 0 ? (
                          <div className="w-full sm:w-auto flex items-center justify-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(product.id, cartQuantity - 1)
                              }
                              className="rounded-full border border-zinc-200 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                            >
                              −
                            </button>
                            <span className="min-w-[1.5rem] sm:min-w-[2rem] text-center text-xs sm:text-sm font-semibold text-zinc-900">
                              {cartQuantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(product.id, cartQuantity + 1)
                              }
                              disabled={cartQuantity >= product.stock}
                              className="rounded-full border border-zinc-200 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="w-full sm:w-auto rounded-full bg-zinc-900 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-zinc-700"
                          >
                            Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        <aside className="w-full lg:w-80">
          <div className="sticky top-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900">Cart</h2>

            {tablesEnabled && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Table (Optional)
                </label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  disabled={loadingActiveSale}
                >
                  <option value="">No table</option>
                  {tables
                    .filter((t) => t.status === 'AVAILABLE' || t.status === 'OCCUPIED' || t.status === 'RESERVED')
                    .map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name} ({table.capacity} seats){table.area ? ` - ${table.area}` : ''} - {table.status}
                      </option>
                    ))}
                </select>
                {loadingActiveSale && (
                  <p className="mt-1 text-xs text-zinc-500">Loading...</p>
                )}
                {activeSale && !loadingActiveSale && (
                  <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-2">
                    <p className="text-xs text-blue-800">
                      Adding to existing order #{activeSale.id.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Current total: ₹{Number(activeSale.totalAmount || 0).toFixed(2)}
                    </p>
                    {activeSale.items && activeSale.items.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        {activeSale.items.length} item(s) in current order
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {cart.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-700">Your cart is empty</p>
            ) : (
              <>
                <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3"
                    >
                      {item.product.imageUrl && (
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${item.product.imageUrl}`}
                          alt={item.product.name}
                          className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-900 truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-xs text-zinc-700">
                          ₹{Number(item.sellingPrice || 0).toFixed(2)} × {Number(item.quantity || 0)}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
                            }
                            className="rounded border border-zinc-200 px-2 py-0.5 text-xs hover:bg-zinc-50"
                          >
                            −
                          </button>
                          <span className="text-xs font-medium text-zinc-700">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.product.stock}
                            className="rounded border border-zinc-200 px-2 py-0.5 text-xs hover:bg-zinc-50 disabled:opacity-50"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="ml-auto text-xs text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-zinc-200 pt-4">
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-zinc-700">
                      Payment Type
                    </label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                    >
                      <option value="cash">Cash</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPaid}
                        onChange={(e) => setIsPaid(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-zinc-200"
                      />
                      <span className="text-sm font-medium text-zinc-700">
                        Mark payment as completed
                      </span>
                    </label>
                  </div>
                  <div className="flex items-center justify-between text-lg font-semibold text-zinc-900">
                    <span>{activeSale ? 'New Items Total' : 'Total'}</span>
                    <span>₹{Number(totalAmount || 0).toFixed(2)}</span>
                  </div>
                  {activeSale && (
                    <div className="flex items-center justify-between text-sm text-zinc-600 border-t border-zinc-200 pt-2">
                      <span>Current Order Total</span>
                      <span>₹{Number(activeSale.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {activeSale && (
                    <div className="flex items-center justify-between text-base font-semibold text-zinc-900 border-t border-zinc-200 pt-2">
                      <span>New Total After Adding</span>
                      <span>₹{(Number(activeSale.totalAmount || 0) + Number(totalAmount || 0)).toFixed(2)}</span>
                    </div>
                  )}
                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut || cart.length === 0}
                    className="mt-4 w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {checkingOut ? 'Processing…' : activeSale ? 'Add to Order' : 'Checkout'}
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

