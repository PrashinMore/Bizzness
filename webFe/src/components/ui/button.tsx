'use client';

import { cn, ui } from '@/lib/ui';
import type React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-light active:bg-ink-dark',
  secondary:
    'border border-border bg-surface text-ink hover:border-ink hover:bg-paper active:bg-accent-muted/40',
  ghost: 'text-muted hover:bg-paper hover:text-ink',
  danger: 'bg-danger text-paper hover:bg-danger/90 active:bg-danger/80',
  accent: 'bg-accent text-paper hover:bg-accent-dark active:bg-accent-dark',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-60',
        ui.focusRing,
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  );
}
