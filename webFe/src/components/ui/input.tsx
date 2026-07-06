import { cn, ui } from '@/lib/ui';
import type React from 'react';

type BaseInputProps = React.InputHTMLAttributes<HTMLInputElement>;
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const fieldClass = cn(
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted shadow-sm transition-colors duration-200',
  'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25',
  ui.focusRing,
);

export function TextInput({ className, ...props }: BaseInputProps) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function SelectInput({ className, ...props }: SelectProps) {
  return <select className={cn(fieldClass, className)} {...props} />;
}

export function TextAreaInput({ className, ...props }: TextareaProps) {
  return <textarea className={cn(fieldClass, 'min-h-24', className)} {...props} />;
}

export function SearchInput({ className, ...props }: BaseInputProps) {
  return <input type="search" className={cn(fieldClass, className)} {...props} />;
}
