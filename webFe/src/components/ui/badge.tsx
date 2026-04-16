import { cn } from '@/lib/ui';
import type React from 'react';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger';

const badgeStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-zinc-100 text-zinc-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
};

export function Badge({
  className,
  variant = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        badgeStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
