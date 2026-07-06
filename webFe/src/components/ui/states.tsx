import type React from 'react';
import { cn } from '@/lib/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from './button';

export function InlineAlert({
  className,
  tone = 'danger',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: 'danger' | 'success' | 'info' | 'warning' }) {
  const toneClasses = {
    danger: 'border-danger/20 bg-danger-muted text-danger',
    success: 'border-success/20 bg-success-muted text-success',
    warning: 'border-warning/20 bg-warning-muted text-warning',
    info: 'border-border bg-paper text-ink',
  };
  return (
    <div
      role="alert"
      className={cn('rounded-lg border px-3 py-2 text-sm', toneClasses[tone], className)}
      {...props}
    />
  );
}

export function LoadingState({
  className,
  message = 'Loading…',
}: {
  className?: string;
  message?: string;
}) {
  return (
    <div className={cn('flex items-center justify-center py-10 text-sm text-muted', className)}>
      {message}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-panel border border-dashed border-border bg-paper px-6 py-10 text-center',
        className,
      )}
    >
      <p className="font-sans text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}
      {actionLabel && (actionHref || onAction) ? (
        <div className="mt-5">
          {actionHref ? (
            <Link href={actionHref}>
              <Button size="sm" variant="primary">
                {actionLabel}
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  className,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      className={className}
      title={title}
      description={description}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
    />
  );
}
