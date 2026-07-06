import { cn } from '@/lib/ui';
import type React from 'react';

export function PageShell({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn('min-h-screen bg-paper px-4 py-6 font-sans md:px-8', className)}
      {...props}
    />
  );
}

export function PageHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 rounded-panel border border-border bg-surface p-5 shadow-soft md:flex-row md:items-center md:justify-between',
        className,
      )}
      {...props}
    />
  );
}

export function PageEyebrow({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold uppercase tracking-[0.2em] text-accent',
        className,
      )}
      {...props}
    />
  );
}

export function PageTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        'font-display text-2xl font-semibold leading-tight text-ink md:text-3xl',
        className,
      )}
      {...props}
    />
  );
}

export function PageSubtitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-2 text-sm leading-relaxed text-muted', className)} {...props} />
  );
}
