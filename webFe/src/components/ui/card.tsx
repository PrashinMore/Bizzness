import { cn } from '@/lib/ui';
import type React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <section
      className={cn(
        'rounded-panel border border-border bg-surface p-5 shadow-soft',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('font-sans text-base font-semibold text-ink', className)}
      {...props}
    />
  );
}
