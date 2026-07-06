import type { ReactNode } from 'react';
import { cn } from '@/lib/ui';
import { TextInput, TextAreaInput, SelectInput } from './input';

type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: string;
  children?: ReactNode;
  className?: string;
};

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type FieldInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
};

export function FieldInput({ label, error, hint, id, className, ...props }: FieldInputProps) {
  const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <FormField label={label} htmlFor={fieldId} error={error} hint={hint}>
      <TextInput id={fieldId} aria-invalid={!!error} className={className} {...props} />
    </FormField>
  );
}

type FieldSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string | null;
  hint?: string;
};

export function FieldSelect({ label, error, hint, id, className, children, ...props }: FieldSelectProps) {
  const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <FormField label={label} htmlFor={fieldId} error={error} hint={hint}>
      <SelectInput id={fieldId} aria-invalid={!!error} className={className} {...props}>
        {children}
      </SelectInput>
    </FormField>
  );
}

type FieldTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string | null;
  hint?: string;
};

export function FieldTextarea({ label, error, hint, id, className, ...props }: FieldTextareaProps) {
  const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <FormField label={label} htmlFor={fieldId} error={error} hint={hint}>
      <TextAreaInput id={fieldId} aria-invalid={!!error} className={className} {...props} />
    </FormField>
  );
}
