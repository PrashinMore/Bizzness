import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { cn, ui } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/ui/states';
import { PageEyebrow, PageTitle, PageSubtitle } from '@/components/ui/shell';

type AuthShellProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  error?: string | null;
};

export function AuthShell({
  eyebrow = 'Staff & inventory control',
  title,
  subtitle,
  children,
  footer,
  error,
}: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage: `
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex justify-center sm:justify-start">
          <Link href="/" className={cn(ui.focusRing)}>
            <BrandLogo withWordmark />
          </Link>
        </div>
        <div className="rounded-panel border border-border bg-surface px-6 py-8 shadow-soft sm:px-8 sm:py-10">
          <PageEyebrow className="text-center sm:text-left">{eyebrow}</PageEyebrow>
          <PageTitle className="mt-3 text-center sm:text-left">{title}</PageTitle>
          <PageSubtitle className="text-center sm:text-left">{subtitle}</PageSubtitle>

          {error ? (
            <InlineAlert className="mt-6" tone="danger">
              {error}
            </InlineAlert>
          ) : null}

          <div className="mt-8">{children}</div>

          {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
        </div>
      </div>
    </main>
  );
}

export function AuthSubmitButton({
  children,
  loading,
  loadingLabel,
}: {
  children: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <Button type="submit" className="w-full" disabled={loading}>
      {loading ? loadingLabel || 'Working…' : children}
    </Button>
  );
}

export function AuthFooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'font-medium text-ink underline underline-offset-4 hover:text-accent-dark',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
      )}
    >
      {children}
    </Link>
  );
}
