'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useOutlet } from '@/contexts/outlet-context';
import { settingsApi, type Settings } from '@/lib/api-client';
import { cn } from '@/lib/ui';
import {
  ChartColumn,
  ClipboardList,
  CreditCard,
  HandCoins,
  LayoutGrid,
  LogOut,
  Package,
  Settings as SettingsIcon,
  Store,
  Users,
} from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled?: boolean;
};

export function SideNav() {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('sidenav-open') !== '0';
  });
  const pathname = usePathname();
  const router = useRouter();
  const { token, logout } = useAuth();
  const { selectedOutlet, outlets, setSelectedOutlet, loading: outletsLoading } = useOutlet();
  const [settings, setSettings] = useState<Settings | null>(null);

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
    cn(
      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200',
      pathname?.startsWith(href)
        ? 'bg-brand-50 text-brand-700'
        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
    );

  const businessName = settings?.businessName || 'Bizzness';
  const businessLogo = settings?.businessLogo;

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { label: 'Menu & Checkout', href: '/menu', icon: CreditCard },
    { label: 'Expenses', href: '/expenses', icon: HandCoins },
    { label: 'Sales', href: '/sales', icon: ClipboardList },
    { label: 'Users', href: '/users', icon: Users },
    { label: 'Inventory', href: '/products', icon: Package },
    { label: 'Tables', href: '/dashboard/tables', icon: Store, enabled: settings?.enableTables },
    { label: 'CRM', href: '/crm', icon: Users, enabled: settings?.enableCRM },
    { label: 'Outlets', href: '/dashboard/outlets', icon: Store },
    { label: 'Reports', href: '/reports', icon: ChartColumn },
    { label: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <>
      <button
        aria-label="Toggle navigation"
        onClick={toggle}
        className="fixed left-4 top-4 z-50 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-soft hover:bg-zinc-50 md:hidden"
      >
        ☰
      </button>

      {!open && (
        <button
          aria-label="Show sidebar"
          onClick={toggle}
          className="fixed left-4 top-4 z-50 hidden rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-soft transition hover:bg-zinc-50 md:flex"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      <aside
        className={`fixed left-0 top-0 z-40 hidden h-full w-64 border-r border-zinc-200 bg-white shadow-soft transition-transform duration-200 md:flex md:flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-3 border-b border-zinc-200 px-4">
          <div className="flex items-center gap-3">
            {businessLogo && (
              <img
                src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${businessLogo}`}
                alt={businessName}
                className="h-9 w-9 rounded-lg object-cover"
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span className="truncate text-sm font-semibold text-zinc-900">{businessName}</span>
          </div>
          <button
            onClick={toggle}
            aria-label="Toggle sidebar"
            className="hidden rounded p-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 md:flex"
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
          <div className="border-b border-zinc-200 px-4 py-3">
            <label className="mb-1 block text-xs font-medium text-zinc-600">Outlet</label>
            <select
              value={selectedOutlet?.id || ''}
              onChange={(e) => {
                const outlet = outlets.find((o) => o.id === e.target.value);
                if (outlet) setSelectedOutlet(outlet);
              }}
              className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name} {outlet.isPrimary && '(Primary)'}
                </option>
              ))}
            </select>
          </div>
        )}
        <nav className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">
            {navItems
              .filter((item) => item.enabled !== false)
              .map((item) => (
                <Link key={item.href} href={item.href} className={linkClasses(item.href)} prefetch={false}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
          </div>
          <div className="border-t border-zinc-200 p-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 py-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navItems
            .filter((item) =>
              ['/dashboard', '/sales', '/products', '/crm', '/settings'].includes(item.href) &&
              item.enabled !== false
            )
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium',
                  pathname?.startsWith(item.href)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-zinc-500',
                )}
                prefetch={false}
              >
                <item.icon className="h-4 w-4" />
                {item.label.split(' ')[0]}
              </Link>
            ))}
        </div>
      </nav>
    </>
  );
}


