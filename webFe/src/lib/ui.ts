export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const ui = {
  colors: {
    brand: 'var(--color-brand-600)',
    success: 'var(--color-success-600)',
    danger: 'var(--color-danger-600)',
    warning: 'var(--color-warning-600)',
  },
  radius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
  },
} as const;
