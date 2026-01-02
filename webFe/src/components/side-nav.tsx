'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useOutlet } from '@/contexts/outlet-context';
import { settingsApi, type Settings } from '@/lib/api-client';

export function SideNav() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { token, logout } = useAuth();
  const { selectedOutlet, outlets, setSelectedOutlet, loading: outletsLoading } = useOutlet();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('sidenav-open') : null;
    if (stored !== null) {
      setOpen(stored === '1');
    }
  }, []);

  useEffect(() => {
    async function loadSettings() {
      if (!token) return;
      try {
        const data = await settingsApi.get(token);
        setSettings(data);
      } catch (err) {
        // Silently fail - just use default "Bizzness"
        console.error('Failed to load settings:', err);
      }
    }
    loadSettings();
  }, [token]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sidenav-open', next ? '1' : '0');
    }
  };

  const linkClasses = (href: string) =>
    `block rounded px-3 py-2 text-sm ${
      pathname?.startsWith(href)
        ? 'bg-zinc-900 text-white'
        : 'text-zinc-700 hover:bg-zinc-100'
    }`;

  const businessName = settings?.businessName || 'Bizzness';
  const businessLogo = settings?.businessLogo;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <>
      <button
        aria-label="Toggle navigation"
        onClick={toggle}
        className="fixed left-3 top-3 z-50 rounded border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50 md:hidden"
      >
        ☰
      </button>

      {!open && (
        <button
          aria-label="Show sidebar"
          onClick={toggle}
          className="fixed left-3 top-3 z-50 hidden md:flex rounded border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50 transition"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-full w-56 border-r border-zinc-200 bg-white shadow-sm transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between gap-3 px-4 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            {businessLogo && (
              <img
                src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${businessLogo}`}
                alt={businessName}
                className="h-8 w-8 rounded object-cover"
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span className="text-sm font-semibold text-zinc-900">{businessName}</span>
          </div>
          <button
            onClick={toggle}
            aria-label="Toggle sidebar"
            className="hidden md:flex rounded p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
          >
            {open ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
        {!outletsLoading && outlets.length > 1 && (
          <div className="border-b border-zinc-200 px-4 py-2">
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Outlet
            </label>
            <select
              value={selectedOutlet?.id || ''}
              onChange={(e) => {
                const outlet = outlets.find((o) => o.id === e.target.value);
                if (outlet) setSelectedOutlet(outlet);
              }}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name} {outlet.isPrimary && '(Primary)'}
                </option>
              ))}
            </select>
          </div>
        )}
        <nav className="flex h-[calc(100vh-3.5rem)] flex-col">
          <div className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
            <Link href="/dashboard" className={linkClasses('/dashboard')} prefetch={false}>
              Dashboard
            </Link>
            <Link href="/menu" className={linkClasses('/menu')} prefetch={false}>
              Menu & Checkout
            </Link>
            <Link href="/expenses" className={linkClasses('/expenses')} prefetch={false}>
              Expenses
            </Link>
            <Link href="/sales" className={linkClasses('/sales')} prefetch={false}>
              Sales
            </Link>
            <Link href="/users" className={linkClasses('/users')} prefetch={false}>
              Users
            </Link>
            <Link href="/products" className={linkClasses('/products')} prefetch={false}>
              Inventory & Stock
            </Link>
            {settings?.enableTables && (
              <Link href="/dashboard/tables" className={linkClasses('/dashboard/tables')} prefetch={false}>
                Tables
              </Link>
            )}
            <Link href="/dashboard/outlets" className={linkClasses('/dashboard/outlets')} prefetch={false}>
              Outlets
            </Link>
          <Link href="/settings" className={linkClasses('/settings')} prefetch={false}>
            Settings
          </Link>
          <Link href="/reports" className={linkClasses('/reports')} prefetch={false}>
            Reports
          </Link>
          <Link href="/profile" className={linkClasses('/profile')} prefetch={false}>
            Manage
          </Link>
          </div>
          <div className="border-t border-zinc-200 p-2">
            <button
              onClick={handleLogout}
              className="w-full rounded px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100"
            >
              Logout
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}


