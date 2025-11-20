'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function SideNav() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('sidenav-open') : null;
    if (stored !== null) {
      setOpen(stored === '1');
    }
  }, []);

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

  return (
    <>
      <button
        aria-label="Toggle navigation"
        onClick={toggle}
        className="fixed left-3 top-3 z-50 rounded border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50 md:hidden"
      >
        ☰
      </button>

      <aside
        className={`fixed left-0 top-0 z-40 h-full w-56 border-r border-zinc-200 bg-white shadow-sm transition-transform duration-200 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center px-4">
          <span className="text-sm font-semibold text-zinc-900">Bizzness</span>
        </div>
        <nav className="space-y-1 px-2">
          <Link href="/dashboard" className={linkClasses('/dashboard')}>
            Dashboard
          </Link>
          <Link href="/menu" className={linkClasses('/menu')}>
            Menu & Checkout
          </Link>
          <Link href="/expenses" className={linkClasses('/expenses')}>
            Expenses
          </Link>
          <Link href="/sales" className={linkClasses('/sales')}>
            Sales
          </Link>
          <Link href="/users" className={linkClasses('/users')}>
            Users
          </Link>
          <Link href="/products" className={linkClasses('/products')}>
            Inventory & Stock
          </Link>
          <Link href="/profile" className={linkClasses('/profile')}>
            Manage
          </Link>
        </nav>
      </aside>
    </>
  );
}


