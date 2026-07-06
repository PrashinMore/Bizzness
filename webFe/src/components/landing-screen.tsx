'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ui } from '@/lib/ui';

function VerifiedStamp() {
  return (
    <div
      className="landing-stamp pointer-events-none absolute -right-2 -top-2 sm:right-4 sm:top-4"
      aria-hidden="true"
    >
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        <circle
          cx="36"
          cy="36"
          r="30"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          fill="var(--paper)"
          fillOpacity="0.92"
        />
        <circle
          cx="36"
          cy="36"
          r="24"
          stroke="var(--success)"
          strokeWidth="0.75"
          strokeOpacity="0.55"
        />
        <text
          x="36"
          y="38"
          textAnchor="middle"
          fill="var(--success)"
          fontSize="8"
          fontWeight="600"
          letterSpacing="2"
          fontFamily="var(--font-body), sans-serif"
        >
          VERIFIED
        </text>
      </svg>
    </div>
  );
}

function LedgerCorner({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-5 w-5 border-border ${className}`}
    />
  );
}

function ActionLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: 'primary' | 'secondary';
  children: ReactNode;
}) {
  const base =
    'inline-flex w-full items-center justify-center gap-2 rounded-sm px-7 py-3.5 text-sm font-semibold tracking-wide transition-colors duration-200 sm:w-auto';

  const styles =
    variant === 'primary'
      ? `bg-ink text-paper hover:bg-ink-light active:bg-ink-dark ${ui.focusRing} group`
      : `border border-border bg-transparent text-ink hover:border-ink hover:bg-paper active:bg-accent-muted/50 ${ui.focusRing}`;

  return (
    <Link href={href} className={`${base} ${styles}`}>
      {variant === 'primary' && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-accent opacity-80 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      )}
      {children}
    </Link>
  );
}

export function LandingScreen() {
  const { user } = useAuth();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4 py-12 text-ink sm:px-6 sm:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px',
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, rgba(250, 247, 242, 0.55) 100%)',
        }}
      />

      <article className="relative z-10 w-full max-w-xl">
        <div className="relative border border-border bg-paper/95 px-6 py-10 shadow-soft sm:px-10 sm:py-12">
          <LedgerCorner className="left-0 top-0 border-l-2 border-t-2" />
          <LedgerCorner className="right-0 top-0 border-r-2 border-t-2" />
          <LedgerCorner className="bottom-0 left-0 border-b-2 border-l-2" />
          <LedgerCorner className="bottom-0 right-0 border-b-2 border-r-2" />

          <VerifiedStamp />

          <div className="mb-8 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
              Bizzness
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <header className="space-y-4 text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
              Staff &amp; Inventory Control
            </p>

            <h1 className="font-display text-[2rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.5rem]">
              Bizzness Control Center
            </h1>

            <p className="max-w-md text-base leading-relaxed text-muted sm:text-[1.05rem]">
              Securely manage staff access, track sales activity, and keep your
              operations aligned. Create an account to get started, or log in with
              your existing credentials.
            </p>
          </header>

          <div
            className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:gap-4"
            role="group"
            aria-label={user ? 'Quick actions' : 'Account actions'}
          >
            {!user ? (
              <>
                <ActionLink href="/signup" variant="primary">
                  Create Account
                </ActionLink>
                <ActionLink href="/login" variant="secondary">
                  Log In
                </ActionLink>
              </>
            ) : (
              <>
                <ActionLink href="/sales" variant="primary">
                  Go to Sales
                </ActionLink>
                <ActionLink href="/sales/new" variant="secondary">
                  Record Sale
                </ActionLink>
              </>
            )}
          </div>

          <div className="mt-10 flex items-center gap-2" aria-hidden="true">
            <span className="h-px flex-1 border-t border-dashed border-border" />
            <span className="text-[9px] uppercase tracking-[0.18em] text-muted/70">
              End of entry
            </span>
            <span className="h-px flex-1 border-t border-dashed border-border" />
          </div>
        </div>
      </article>
    </main>
  );
}
