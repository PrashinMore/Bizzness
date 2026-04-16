import { cn } from '@/lib/ui';
import type React from 'react';

type BaseInputProps = React.InputHTMLAttributes<HTMLInputElement>;
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const fieldClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm transition-all duration-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100';

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
  return (
    <input
      type="search"
      className={cn(fieldClass, 'pl-4', className)}
      {...props}
    />
  );
}
