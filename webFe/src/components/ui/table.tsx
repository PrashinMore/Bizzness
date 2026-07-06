import { cn } from '@/lib/ui';
import type React from 'react';

export function DataTable({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn('responsive-table min-w-full text-sm', className)}
      {...props}
    />
  );
}

export function DataTableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-paper', className)} {...props} />;
}

export function DataTableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border/60 bg-surface', className)} {...props} />;
}

export function DataTableHeaderCell({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted',
        className,
      )}
      {...props}
    />
  );
}

export function DataTableCell({
  className,
  'data-label': dataLabel,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { 'data-label'?: string }) {
  return (
    <td
      data-label={dataLabel}
      className={cn('tabular-data px-4 py-3 text-ink', className)}
      {...props}
    />
  );
}
