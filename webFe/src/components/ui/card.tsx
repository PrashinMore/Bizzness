import { cn } from '@/lib/ui';
import type React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft',
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
    <h2 className={cn('text-base font-semibold text-zinc-900', className)} {...props} />
  );
}
