import type React from 'react';
import { cn } from '@/lib/ui';

export function InlineAlert({
  className,
  tone = 'danger',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: 'danger' | 'success' | 'info' }) {
  const toneClasses = {
    danger: 'border-danger-100 bg-danger-100 text-danger-700',
    success: 'border-success-100 bg-success-100 text-success-700',
    info: 'border-brand-100 bg-brand-50 text-brand-700',
  };
  return (
    <div
      className={cn('rounded-lg border px-3 py-2 text-sm', toneClasses[tone], className)}
      {...props}
    />
  );
}

export function LoadingState({
  className,
  message = 'Loading...',
}: {
  className?: string;
  message?: string;
}) {
  return (
    <div className={cn('flex items-center justify-center py-10 text-sm text-zinc-600', className)}>
      {message}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center', className)}>
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      {description && <p className="mt-1 text-sm text-zinc-600">{description}</p>}
    </div>
  );
}
