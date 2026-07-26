'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import {
  productsApi,
  salesApi,
  tablesApi,
  settingsApi,
  stockApi,
  crmApi,
  recipesApi,
} from '@/lib/api-client';
import type { Product } from '@/types/product';
import type { DiningTable } from '@/types/table';
import type { Sale } from '@/types/sale';
import type { Customer } from '@/types/crm';
import { useRouter } from 'next/navigation';
import { RecipeEditor } from '@/components/recipe-editor';

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
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [crmEnabled, setCrmEnabled] = useState(false);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [eligibleRewards, setEligibleRewards] = useState<Array<{
    id: string;
    name: string;
    description?: string;
    type: 'DISCOUNT_PERCENTAGE' | 'DISCOUNT_FIXED' | 'FREE_ITEM' | 'CASHBACK';
    pointsRequired: number;
    discountPercentage?: number;
    discountAmount?: number;
    freeItemName?: string;
    cashbackAmount?: number;
    minOrderValue?: number;
    maxDiscountAmount?: number;
  }>>([]);
  const [redemptionDiscount, setRedemptionDiscount] = useState<number>(0);
  const [loadingEligibleRewards, setLoadingEligibleRewards] = useState(false);

  // ---------------------------------------------------------------------------
  // Recipe-inventory UX state
  // ---------------------------------------------------------------------------
  // Products the cashier tried to sell but the backend rejected for lack of
  // ingredient stock. We keep them "temporarily disabled" in the UI so the
  // cashier doesn't keep hitting the same error; they re-enable themselves on
  // the next menu reload.
  const [disabledProductIds, setDisabledProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [toast, setToast] = useState<string | null>(null);
  // Product to open the recipe editor for — either from an explicit "add recipe"
  // prompt (after checkout finds a RECIPE dish with no recipe) or from an
  // error path ("no recipe configured").
  const [recipeEditorProduct, setRecipeEditorProduct] = useState<Product | null>(null);
  // Prompt banner state: "Track ingredients for <dish>?" shown after the most
  // recent checkout if we detected a RECIPE product with no recipe attached.
  const [recipePrompt, setRecipePrompt] = useState<Product | null>(null);

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
        setCrmEnabled(settings.enableCRM || false);
        setLoyaltyEnabled(settings.enableLoyalty || false);
        
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

  // Search for customer when phone number changes
  useEffect(() => {
    async function searchCustomer() {
      if (!token || !crmEnabled || !customerPhone.trim()) {
        setSelectedCustomer(null);
        return;
      }

      const normalizedPhone = customerPhone.replace(/\D/g, '');
      if (normalizedPhone.length < 10) {
        setSelectedCustomer(null);
        return;
      }

      try {
        const response = await crmApi.listCustomers(token, {
          search: normalizedPhone,
          size: 10,
        });
        
        // Find exact phone match
        const exactMatch = response.customers.find(
          (c) => c.phone.replace(/\D/g, '') === normalizedPhone
        );
        
        if (exactMatch) {
          setSelectedCustomer(exactMatch);
          setCustomerName(''); // Clear name input if customer found
        } else {
          setSelectedCustomer(null);
        }
      } catch (err) {
        console.error('Failed to search customer:', err);
        setSelectedCustomer(null);
      }
    }

    // Debounce search
    const timeoutId = setTimeout(searchCustomer, 500);
    return () => clearTimeout(timeoutId);
  }, [token, crmEnabled, customerPhone]);

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
        
        // Get outlet ID from localStorage and fetch stock for all products
        const outletId = typeof window !== 'undefined' ? localStorage.getItem('selected-outlet-id') : null;
        if (outletId && data.length > 0) {
          try {
            const productIds = data.map(p => p.id);
            const stockData = await stockApi.getForOutlet(token, outletId, productIds);
            const stockMap = new Map<string, number>();
            stockData.forEach(stock => {
              stockMap.set(stock.productId, stock.quantity);
            });
            
            // Attach stock to products
            const productsWithStock = data.map(product => ({
              ...product,
              stock: stockMap.get(product.id) ?? 0,
            }));
            setMenuItems(productsWithStock);
          } catch (stockErr) {
            console.warn('Failed to load stock, showing products without stock:', stockErr);
            // If stock fetch fails, show products with stock = 0
            const productsWithStock = data.map(product => ({
              ...product,
              stock: 0,
            }));
            setMenuItems(productsWithStock);
          }
        } else {
          // No outlet selected, show products with stock = 0
          const productsWithStock = data.map(product => ({
            ...product,
            stock: 0,
          }));
          setMenuItems(productsWithStock);
        }
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

  const subtotalAmount = useMemo(() => {
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

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotalAmount - redemptionDiscount);
  }, [subtotalAmount, redemptionDiscount]);

  // Load eligible rewards when customer and cart change
  useEffect(() => {
    async function loadEligibleRewards() {
      if (
        !token ||
        !loyaltyEnabled ||
        !selectedCustomer?.loyaltyAccount ||
        subtotalAmount <= 0
      ) {
        setEligibleRewards([]);
        setSelectedRewardId(null);
        setRedemptionDiscount(0);
        return;
      }

      setLoadingEligibleRewards(true);
      try {
        const rewards = await crmApi.getEligibleRewards(
          token,
          selectedCustomer.id,
          subtotalAmount,
        );
        setEligibleRewards(rewards);
        // Reset selection if current reward is no longer eligible
        if (selectedRewardId && !rewards.find(r => r.id === selectedRewardId)) {
          setSelectedRewardId(null);
          setRedemptionDiscount(0);
        }
      } catch (err) {
        console.error('Failed to load eligible rewards:', err);
        setEligibleRewards([]);
      } finally {
        setLoadingEligibleRewards(false);
      }
    }

    loadEligibleRewards();
  }, [token, loyaltyEnabled, selectedCustomer?.id, subtotalAmount, selectedRewardId]);

  // Calculate discount when selected reward changes
  useEffect(() => {
    if (!selectedRewardId || eligibleRewards.length === 0) {
      setRedemptionDiscount(0);
      return;
    }

    const selectedReward = eligibleRewards.find(r => r.id === selectedRewardId);
    if (!selectedReward) {
      setRedemptionDiscount(0);
      return;
    }

    let discount = 0;
    if (selectedReward.type === 'DISCOUNT_PERCENTAGE' && selectedReward.discountPercentage) {
      discount = (subtotalAmount * selectedReward.discountPercentage) / 100;
    } else if (selectedReward.type === 'DISCOUNT_FIXED' && selectedReward.discountAmount) {
      discount = selectedReward.discountAmount;
    }

    // Apply maximum discount limit
    if (selectedReward.maxDiscountAmount && discount > selectedReward.maxDiscountAmount) {
      discount = selectedReward.maxDiscountAmount;
    }

    // Don't exceed bill amount
    discount = Math.min(discount, subtotalAmount);
    setRedemptionDiscount(discount);
  }, [selectedRewardId, eligibleRewards, subtotalAmount]);

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

        // Snapshot cart before clearing so the recipe probe still has it.
        const soldItems = [...cart];
        setCart([]);
        const missing = await findMissingRecipe(soldItems);
        if (missing) {
          setRecipePrompt(missing);
          setToast(`Order updated. Want to track ingredients for "${missing.name}"?`);
          return;
        }
        router.push(`/sales/${activeSale.id}`);
      } else {
        // Handle reward redemption if applicable
        let finalTotalAmount = Number(totalAmount.toFixed(2));
        let loyaltyPointsRedeemed = 0;
        let loyaltyDiscountAmount = 0;

        if (
          loyaltyEnabled &&
          selectedCustomer?.loyaltyAccount &&
          selectedRewardId &&
          redemptionDiscount > 0
        ) {
          try {
            const redemption = await crmApi.redeemReward(
              token,
              {
                customerId: selectedCustomer.id,
                rewardId: selectedRewardId,
                billAmount: subtotalAmount,
              },
            );
            loyaltyPointsRedeemed = redemption.pointsUsed;
            loyaltyDiscountAmount = redemption.discountAmount;
            finalTotalAmount = Number((subtotalAmount - redemption.discountAmount).toFixed(2));
            // Update selected customer with new points
            if (selectedCustomer.loyaltyAccount) {
              selectedCustomer.loyaltyAccount.points = redemption.pointsAfter;
            }
          } catch (err) {
            console.error('Reward redemption failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to redeem reward. Please try again.');
            setCheckingOut(false);
            return;
          }
        }

        // Create new sale
        const payload = {
          date: new Date().toISOString(),
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity) || 0,
            sellingPrice: Number(item.sellingPrice) || 0,
          })),
          totalAmount: finalTotalAmount,
          soldBy: user.id,
          paymentType: paymentType,
          isPaid: isPaid,
          tableId: selectedTableId || undefined,
          ...(selectedCustomer
            ? { customerId: selectedCustomer.id }
            : customerPhone.trim()
            ? {
                customerPhone: customerPhone.trim(),
                ...(customerName.trim() && { customerName: customerName.trim() }),
              }
            : {}),
          visitType: 'DINE_IN' as const,
          ...(loyaltyPointsRedeemed > 0 && {
            loyaltyPointsRedeemed,
            loyaltyDiscountAmount,
          }),
        };

        const created = await salesApi.create(token, payload);
        // Snapshot cart before clearing so the recipe probe still has it.
        const soldItems = [...cart];
        setCart([]);
        setSelectedTableId('');
        setActiveSale(null);
        setCustomerPhone('');
        setCustomerName('');
        setSelectedCustomer(null);
        setSelectedRewardId(null);
        setRedemptionDiscount(0);
        const missing = await findMissingRecipe(soldItems);
        if (missing) {
          setRecipePrompt(missing);
          setToast(`Sale recorded. Want to track ingredients for "${missing.name}"?`);
          // Stay on menu so the cashier can accept/dismiss. They can still
          // open the sale from the Sales tab if they want.
          return;
        }
        router.push(`/sales/${created.id}`);
      }
    } catch (err) {
      handleCheckoutError(err);
    } finally {
      setCheckingOut(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Error routing. Recipe-backed inventory produces two common 400s that we
  // want to handle specially in the UI:
  //
  //  1. "Insufficient stock for ingredient X" — cashier can't fulfill this
  //     dish right now. We show a toast and temporarily disable the dish so
  //     the same error can't fire again for this session.
  //
  //  2. "No recipe configured for product Y" — the admin forgot to set up
  //     the recipe. We open the recipe editor on the faulted dish so it
  //     can be fixed in place rather than sending the cashier hunting.
  //
  // Anything else falls back to the generic error banner.
  // ---------------------------------------------------------------------------
  const handleCheckoutError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unable to complete checkout.';
    const lower = message.toLowerCase();

    if (lower.includes('insufficient') && lower.includes('ingredient')) {
      setToast(message);
      // Best-effort: try to match the faulted product name back to cart items,
      // then disable every RECIPE cart item mentioned. Without structured
      // error data from the backend we just disable all RECIPE items in the
      // cart — safer than letting the cashier retry blindly.
      setDisabledProductIds((prev) => {
        const next = new Set(prev);
        cart.forEach((item) => {
          if ((item.product.inventoryType ?? 'SIMPLE') === 'RECIPE') {
            next.add(item.productId);
          }
        });
        return next;
      });
      setError(null);
      return;
    }

    if (lower.includes('recipe') && (lower.includes('not') || lower.includes('no '))) {
      // Find the RECIPE product in the cart that the backend is complaining
      // about and hand it to the editor for immediate fix-in-place.
      const culprit = cart.find(
        (item) => (item.product.inventoryType ?? 'SIMPLE') === 'RECIPE',
      );
      if (culprit) {
        setToast(`${culprit.product.name} needs a recipe before it can be sold.`);
        setRecipeEditorProduct(culprit.product);
        setError(null);
        return;
      }
    }

    setError(message);
  };

  // Post-checkout probe: for every RECIPE dish that was just sold, confirm it
  // has a recipe attached. Returns the first dish lacking a recipe (or null),
  // so the caller can decide whether to navigate away or show the lazy
  // "Track ingredients for this item?" prompt first. We dedupe to keep this
  // to one request per distinct product.
  const findMissingRecipe = useCallback(
    async (soldItems: CartItem[]): Promise<Product | null> => {
      if (!token) {
        return null;
      }
      const seen = new Set<string>();
      for (const item of soldItems) {
        if (seen.has(item.productId)) continue;
        seen.add(item.productId);
        if ((item.product.inventoryType ?? 'SIMPLE') !== 'RECIPE') continue;
        try {
          const recipe = await recipesApi.getByProduct(token, item.productId);
          if (!recipe || recipe.items.length === 0) {
            return item.product;
          }
        } catch {
          // Silent — a failed probe isn't worth interrupting the cashier.
        }
      }
      return null;
    },
    [token],
  );

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm text-muted">Loading menu…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:flex-row">
        {/* Menu Items Grid */}
        <div className="flex-1">
          <header className="mb-6">
            <h1 className="text-3xl font-semibold text-ink">Menu</h1>
            <p className="mt-2 text-sm text-muted">
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
                className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
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
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-paper"
              >
                Clear
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-danger/20 bg-danger-muted px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Lightweight toast-style banner for recipe/ingredient feedback.
              Sits above the grid so it's visible while the cashier decides
              what to do next. Auto-clears on any subsequent action. */}
          {toast && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-warning/30 bg-warning-muted px-3 py-2 text-sm text-amber-900">
              <span>{toast}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-amber-700 hover:text-amber-900"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Lazy recipe prompt — shown after a checkout that included a
              RECIPE-typed dish with no recipe yet. Two actions only: wire up
              the recipe now, or ignore (dismisses until next occurrence). */}
          {recipePrompt && (
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-brand-200 bg-accent-muted px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-brand-900">
                  Track ingredients for &quot;{recipePrompt.name}&quot;?
                </p>
                <p className="text-xs text-accent-dark">
                  Set up its recipe once and future sales will deduct raw
                  materials automatically.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecipeEditorProduct(recipePrompt);
                    setRecipePrompt(null);
                  }}
                  className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Add recipe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecipePrompt(null);
                    setToast(null);
                  }}
                  className="rounded-full border border-brand-200 bg-surface px-4 py-1.5 text-xs font-semibold text-accent-dark hover:bg-brand-100"
                >
                  Ignore
                </button>
              </div>
            </div>
          )}

          {fetching ? (
            <p className="text-sm text-muted">Loading menu items…</p>
          ) : menuItems.length === 0 ? (
            <div className="rounded-panel bg-surface p-8 shadow-sm">
              <p className="text-sm text-muted">
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
                const stock = product.stock ?? 0;

                // Branch availability on inventory type. Only SIMPLE products
                // have a meaningful stock count on this row — for RECIPE dishes,
                // "stock" lives on the ingredients and the backend is the
                // source of truth. We default to Available for RECIPE and
                // rely on a disabled flip after an ingredient-out-of-stock
                // error to stop the cashier from retrying.
                const inventoryType = product.inventoryType ?? 'SIMPLE';
                const trackInventory = product.trackInventory ?? true;
                const isRecipe = inventoryType === 'RECIPE';
                const isUntracked = !trackInventory || inventoryType === 'NONE';
                const isTemporarilyDisabled = disabledProductIds.has(product.id);
                const isSimpleOutOfStock =
                  inventoryType === 'SIMPLE' && trackInventory && stock <= 0;
                const isLowSimpleStock =
                  inventoryType === 'SIMPLE' &&
                  trackInventory &&
                  stock > 0 &&
                  stock <= product.lowStockThreshold;
                const isOutOfStock = isSimpleOutOfStock || isTemporarilyDisabled;

                return (
                  <div
                    key={product.id}
                    className={`rounded-2xl bg-surface p-3 sm:p-6 shadow-sm transition hover:shadow-md ${
                      isOutOfStock ? 'opacity-60' : ''
                    }`}
                  >
                    {product.imageUrl ? (
                      <div className="mb-3 sm:mb-4 aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl bg-paper">
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
                      <div className="mb-3 sm:mb-4 aspect-square w-full rounded-xl sm:rounded-2xl bg-paper flex items-center justify-center">
                        <span className="text-muted text-xs sm:text-sm">No image</span>
                      </div>
                    )}

                    <h3 className="text-sm sm:text-lg font-semibold text-ink line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-muted line-clamp-1">
                      {product.category}
                    </p>

                    <div className="mt-3 sm:mt-4">
                      <div className="mb-2 sm:mb-3">
                        <p className="text-base sm:text-2xl font-bold text-ink">
                          ₹{Number(product.sellingPrice).toFixed(2)}
                        </p>
                        {/* Availability display — distinct per inventory type so
                            the cashier sees the right signal at a glance. */}
                        {inventoryType === 'SIMPLE' && trackInventory && stock > 0 && (
                          <p
                            className={`text-xs ${
                              isLowSimpleStock ? 'text-amber-600' : 'text-muted'
                            }`}
                          >
                            {isLowSimpleStock ? '⚠ ' : ''}
                            {stock} in stock
                          </p>
                        )}
                        {isSimpleOutOfStock && (
                          <p className="text-xs text-red-500">Out of stock</p>
                        )}
                        {isRecipe && !isTemporarilyDisabled && (
                          <p className="text-xs text-emerald-600">Available</p>
                        )}
                        {isRecipe && isTemporarilyDisabled && (
                          <p className="text-xs text-red-500">
                            Ingredients unavailable
                          </p>
                        )}
                        {isUntracked && (
                          <p className="text-xs text-muted/60">Always available</p>
                        )}
                      </div>

                      <div className="flex items-center justify-center sm:justify-start">
                        {isOutOfStock ? (
                          <button
                            disabled
                            className="w-full sm:w-auto rounded-full border border-border px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold text-muted cursor-not-allowed"
                          >
                            Out of Stock
                          </button>
                        ) : cartQuantity > 0 ? (
                          <div className="w-full sm:w-auto flex items-center justify-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(product.id, cartQuantity - 1)
                              }
                              className="rounded-full border border-border px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-muted hover:bg-paper"
                            >
                              −
                            </button>
                            <span className="min-w-[1.5rem] sm:min-w-[2rem] text-center text-xs sm:text-sm font-semibold text-ink">
                              {cartQuantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(product.id, cartQuantity + 1)
                              }
                              // For SIMPLE/tracked we cap at on-hand stock so
                              // the cashier can't oversell. RECIPE and
                              // untracked items have no upfront cap — the
                              // backend is authoritative during checkout.
                              disabled={
                                inventoryType === 'SIMPLE' &&
                                trackInventory &&
                                cartQuantity >= stock
                              }
                              className="rounded-full border border-border px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-muted hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="w-full sm:w-auto rounded-lg bg-ink px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-ink-light"
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
          <div className="sticky top-6 rounded-panel bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-ink">Cart</h2>

            {crmEnabled && (
              <>
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-muted">
                    Customer Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter customer phone number"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                  />
                  {selectedCustomer ? (
                    <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
                      <p className="text-sm font-medium text-blue-900">
                        {selectedCustomer.name}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        {selectedCustomer.phone}
                      </p>
                      {selectedCustomer.loyaltyAccount && (
                        <p className="text-xs text-amber-700 mt-1 font-semibold">
                          ⭐ {selectedCustomer.loyaltyAccount.points} points ({selectedCustomer.loyaltyAccount.tier})
                        </p>
                      )}
                      {loyaltyEnabled && selectedCustomer.loyaltyAccount && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          {loadingEligibleRewards ? (
                            <p className="text-xs text-blue-600">Loading rewards...</p>
                          ) : eligibleRewards.length === 0 ? (
                            <p className="text-xs text-muted">No eligible rewards available</p>
                          ) : (
                            <>
                              <p className="text-xs text-blue-700 mb-2 font-medium">
                                Available Rewards:
                              </p>
                              <div className="space-y-2">
                                {eligibleRewards.map((reward) => {
                                  const getRewardDesc = () => {
                                    if (reward.type === 'DISCOUNT_PERCENTAGE') {
                                      return `${reward.discountPercentage}% discount${reward.maxDiscountAmount ? ` (max ₹${reward.maxDiscountAmount})` : ''}`;
                                    }
                                    if (reward.type === 'DISCOUNT_FIXED') {
                                      return `₹${reward.discountAmount} off${reward.maxDiscountAmount ? ` (max ₹${reward.maxDiscountAmount})` : ''}`;
                                    }
                                    if (reward.type === 'FREE_ITEM') {
                                      return `Free ${reward.freeItemName}`;
                                    }
                                    if (reward.type === 'CASHBACK') {
                                      return `₹${reward.cashbackAmount} cashback`;
                                    }
                                    return '';
                                  };
                                  const isSelected = selectedRewardId === reward.id;
                                  return (
                                    <button
                                      key={reward.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedRewardId(isSelected ? null : reward.id);
                                      }}
                                      className={`w-full text-left rounded border p-2 text-xs transition ${
                                        isSelected
                                          ? 'border-green-500 bg-green-50'
                                          : 'border-blue-200 bg-surface hover:bg-blue-50'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <p className={`font-medium ${isSelected ? 'text-green-900' : 'text-blue-900'}`}>
                                            {reward.name}
                                          </p>
                                          <p className={`mt-0.5 ${isSelected ? 'text-green-700' : 'text-blue-700'}`}>
                                            {getRewardDesc()}
                                          </p>
                                          {reward.minOrderValue && (
                                            <p className="mt-0.5 text-muted text-[10px]">
                                              Min order: ₹{reward.minOrderValue}
                                            </p>
                                          )}
                                        </div>
                                        <div className="ml-2 text-right">
                                          <p className={`text-xs font-semibold ${isSelected ? 'text-green-700' : 'text-amber-700'}`}>
                                            {reward.pointsRequired} pts
                                          </p>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              {selectedRewardId && redemptionDiscount > 0 && (
                                <div className="mt-2 pt-2 border-t border-green-200">
                                  <p className="text-xs font-semibold text-green-700">
                                    Discount: -₹{redemptionDiscount.toFixed(2)}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : customerPhone.trim() ? (
                    <p className="mt-1 text-xs text-blue-600">
                      New customer will be created
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted">
                      Customer will be automatically created/linked if phone is provided
                    </p>
                  )}
                </div>
                {customerPhone.trim() && !selectedCustomer && (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-muted">
                      Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                    />
                    <p className="mt-1 text-xs text-muted">
                      Leave empty to create customer as &ldquo;Guest&rdquo;
                    </p>
                  </div>
                )}
              </>
            )}

            {tablesEnabled && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-muted">
                  Table (Optional)
                </label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
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
                  <p className="mt-1 text-xs text-muted">Loading...</p>
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
              <p className="mt-4 text-sm text-muted">Your cart is empty</p>
            ) : (
              <>
                <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-start gap-3 rounded-lg border border-border p-3"
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
                        <h4 className="text-sm font-semibold text-ink truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-xs text-muted">
                          ₹{Number(item.sellingPrice || 0).toFixed(2)} × {Number(item.quantity || 0)}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
                            }
                            className="rounded border border-border px-2 py-0.5 text-xs hover:bg-paper"
                          >
                            −
                          </button>
                          <span className="text-xs font-medium text-muted">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                            // Only cap SIMPLE/tracked items; RECIPE and
                            // untracked items have no client-side ceiling.
                            disabled={
                              (item.product.inventoryType ?? 'SIMPLE') === 'SIMPLE' &&
                              (item.product.trackInventory ?? true) &&
                              item.quantity >= (item.product.stock ?? 0)
                            }
                            className="rounded border border-border px-2 py-0.5 text-xs hover:bg-paper disabled:opacity-50"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="ml-auto text-xs text-danger hover:text-danger"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-border pt-4">
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-muted">
                      Payment Type
                    </label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
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
                        className="h-4 w-4 rounded border-border text-ink focus:ring-2 focus:ring-accent/25"
                      />
                      <span className="text-sm font-medium text-muted">
                        Mark payment as completed
                      </span>
                    </label>
                  </div>
                  {redemptionDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-700 mb-2">
                      <span>Subtotal</span>
                      <span>₹{Number(subtotalAmount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {redemptionDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-700 mb-2">
                      <span>Loyalty Discount</span>
                      <span>-₹{redemptionDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-lg font-semibold text-ink">
                    <span>{activeSale ? 'New Items Total' : 'Total'}</span>
                    <span>₹{Number(totalAmount || 0).toFixed(2)}</span>
                  </div>
                  {activeSale && (
                    <div className="flex items-center justify-between text-sm text-muted border-t border-border pt-2">
                      <span>Current Order Total</span>
                      <span>₹{Number(activeSale.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {activeSale && (
                    <div className="flex items-center justify-between text-base font-semibold text-ink border-t border-border pt-2">
                      <span>New Total After Adding</span>
                      <span>₹{(Number(activeSale.totalAmount || 0) + Number(totalAmount || 0)).toFixed(2)}</span>
                    </div>
                  )}
                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut || cart.length === 0}
                    className="mt-4 w-full rounded-lg bg-ink px-6 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-ink-light disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {checkingOut ? 'Processing…' : activeSale ? 'Add to Order' : 'Checkout'}
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Recipe editor — shared across error paths and the lazy prompt. We
          mount it at the page root so it overlays the whole screen. After
          saving, the temporary-disable set is cleared for that product so
          the cashier can retry immediately. */}
      {recipeEditorProduct && (
        <RecipeEditor
          open={Boolean(recipeEditorProduct)}
          onClose={() => setRecipeEditorProduct(null)}
          token={token}
          product={recipeEditorProduct}
          allProducts={allMenuItems}
          outletId={
            typeof window !== 'undefined'
              ? localStorage.getItem('selected-outlet-id')
              : null
          }
          onSaved={(saved) => {
            setDisabledProductIds((prev) => {
              const next = new Set(prev);
              next.delete(saved.productId);
              return next;
            });
            setToast(`Recipe saved for "${recipeEditorProduct.name}".`);
          }}
        />
      )}
    </main>
  );
}

