import { cn } from '@/lib/ui';
import type { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: ReactNode;
  sublabel?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
};

const toneValue: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-ink',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function StatCard({ label, value, sublabel, tone = 'default', className }: StatCardProps) {
  return (
    <div className={cn('rounded-panel border border-border bg-surface p-5 shadow-soft', className)}>
      <p className="text-xs font-medium tracking-wide text-muted">{label}</p>
      <p
        className={cn(
          'tabular-data mt-2 font-display text-3xl font-semibold leading-none md:text-4xl',
          toneValue[tone],
        )}
      >
        {value}
      </p>
      {sublabel ? <p className="mt-2 text-xs text-muted">{sublabel}</p> : null}
    </div>
  );
}
