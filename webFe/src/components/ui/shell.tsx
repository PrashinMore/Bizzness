import { cn } from '@/lib/ui';

export function PageShell({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return <main className={cn('min-h-screen bg-app px-4 py-6 md:px-8', className)} {...props} />;
}

export function PageHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft md:flex-row md:items-center md:justify-between',
        className,
      )}
      {...props}
    />
  );
}
