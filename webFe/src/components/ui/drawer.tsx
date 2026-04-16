'use client';

import type React from 'react';
import { cn } from '@/lib/ui';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Drawer({ open, onClose, title, children, className }: DrawerProps) {
  return (
    <div className={cn('fixed inset-0 z-[70]', open ? 'pointer-events-auto' : 'pointer-events-none')}>
      <button
        aria-label="Close drawer overlay"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-zinc-900/40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <aside
        className={cn(
          'absolute right-0 top-0 h-full w-full max-w-md border-l border-zinc-200 bg-white shadow-lifted transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">{title || 'Details'}</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>
        <div className="h-[calc(100%-53px)] overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
