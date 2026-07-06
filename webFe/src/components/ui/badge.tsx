import { cn } from '@/lib/ui';
import type React from 'react';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger';

const badgeStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-paper text-muted border border-border',
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  danger: 'bg-danger-muted text-danger',
};

export function Badge({
  className,
  variant = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        badgeStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
