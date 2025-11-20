'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { productsApi, salesApi } from '@/lib/api-client';
import type { Product } from '@/types/product';
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

  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);

  // Filter products by category "menu item" (case-insensitive)
  const menuItems = useMemo(
    () => products.filter((p) => p.category.toLowerCase().includes('menu')),
    [products],
  );

  useEffect(() => {
    async function loadProducts() {
      if (!token) {
        return;
      }
      setFetching(true);
      setError(null);
      try {
        const data = await productsApi.list(token);
        setProducts(data);
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
  }, [loading, user, token]);

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
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const totalAmount = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.sellingPrice * item.quantity,
        0,
      ),
    [cart],
  );

  const handleCheckout = async () => {
    if (!token || !user || cart.length === 0) {
      return;
    }

    setCheckingOut(true);
    setError(null);

    try {
      const payload = {
        date: new Date().toISOString(),
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
        })),
        totalAmount: Number(totalAmount.toFixed(2)),
        soldBy: user.id,
      };

      const created = await salesApi.create(token, payload);
      setCart([]);
      router.push(`/sales/${created.id}`);
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
        <p className="text-sm text-zinc-500">Loading menu…</p>
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
            <p className="mt-2 text-sm text-zinc-500">
              Select items to add to your cart
            </p>
          </header>

          {error && (
            <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {fetching ? (
            <p className="text-sm text-zinc-500">Loading menu items…</p>
          ) : menuItems.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 shadow-sm">
              <p className="text-sm text-zinc-500">
                No menu items found. Add products with category containing "menu"
                to see them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 sm:gap-6">
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
                        <span className="text-zinc-400 text-xs sm:text-sm">No image</span>
                      </div>
                    )}

                    <h3 className="text-sm sm:text-lg font-semibold text-zinc-900 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-500 line-clamp-1">
                      {product.category}
                    </p>

                    <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-base sm:text-2xl font-bold text-zinc-900">
                          ₹{Number(product.sellingPrice).toFixed(2)}
                        </p>
                        {product.stock > 0 && (
                          <p className="text-xs text-zinc-400">
                            {product.stock} in stock
                          </p>
                        )}
                        {isOutOfStock && (
                          <p className="text-xs text-red-500">Out of stock</p>
                        )}
                      </div>

                      {isOutOfStock ? (
                        <button
                          disabled
                          className="rounded-full border border-zinc-200 px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold text-zinc-400 cursor-not-allowed"
                        >
                          Out of Stock
                        </button>
                      ) : cartQuantity > 0 ? (
                        <div className="flex items-center justify-center gap-2">
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
                          className="rounded-full bg-zinc-900 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-zinc-700"
                        >
                          Add to Cart
                        </button>
                      )}
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

            {cart.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">Your cart is empty</p>
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
                        <p className="text-xs text-zinc-500">
                          ₹{item.sellingPrice.toFixed(2)} × {item.quantity}
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
                  <div className="flex items-center justify-between text-lg font-semibold text-zinc-900">
                    <span>Total</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut || cart.length === 0}
                    className="mt-4 w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {checkingOut ? 'Processing…' : 'Checkout'}
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

