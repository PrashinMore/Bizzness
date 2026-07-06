'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { cn, ui } from '@/lib/ui';
import { DashboardPreview } from './dashboard-preview';
import { FaqAccordion } from './faq-accordion';
import { VerifiedStamp } from './verified-stamp';
import {
  BarChart3,
  ClipboardList,
  Package,
  Receipt,
  Users,
} from 'lucide-react';

const TRUST_SHOPS = [
  'Shree Ganesh Traders',
  'Coastal Kitchen',
  'Patil General Store',
  'Irani Tea House',
  'Kulkarni Kirana',
];

const PAIN_POINTS = [
  {
    icon: Package,
    text: 'Stock runs out and nobody notices until a customer asks.',
  },
  {
    icon: Users,
    text: "Staff clock in, but you can't see who did what.",
  },
  {
    icon: ClipboardList,
    text: 'Month-end books take a full day to reconcile.',
  },
];

const FEATURES = [
  {
    title: 'Inventory that tracks itself',
    body: 'Get notified before you run out. Set reorder points once, and Bizzness flags low stock automatically.',
    icon: Package,
    visual: 'inventory' as const,
  },
  {
    title: 'Billing in seconds',
    body: 'GST-compliant invoices, UPI and cash payments, all logged automatically. No separate billing software needed.',
    icon: Receipt,
    visual: 'billing' as const,
  },
  {
    title: 'Know what your staff is doing',
    body: 'Give each employee their own login with the access they need — nothing more. See who billed what, and when.',
    icon: Users,
    visual: 'staff' as const,
  },
  {
    title: 'Sales, at a glance',
    body: 'Daily and weekly numbers that actually mean something — top items, slow movers, and revenue trends, without exporting a single spreadsheet.',
    icon: BarChart3,
    visual: 'sales' as const,
  },
];

const STEPS = [
  {
    title: 'Create your account',
    body: 'Takes under 2 minutes. No credit card needed for the trial.',
  },
  {
    title: 'Add your products',
    body: 'Import from a spreadsheet or add them as you go.',
  },
  {
    title: 'Start billing',
    body: 'Your staff can start using it the same day — no training manual required.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Before Bizzness I found out I was out of cooking oil when a customer was already at the counter. Now I get a message the day before.',
    name: 'Priya M.',
    shop: 'Coastal Kitchen, Pune',
    initials: 'PM',
  },
  {
    quote:
      'My two staff members used to share one login. Now I actually know who closed the register each night.',
    name: 'Rahul K.',
    shop: 'Patil General Store, Nashik',
    initials: 'RK',
  },
  {
    quote:
      'Month-end used to mean a full Sunday with the calculator. Last month I had the numbers in twenty minutes.',
    name: 'Anita S.',
    shop: 'Shree Ganesh Traders, Kolhapur',
    initials: 'AS',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Do I need to be tech-savvy to use this?',
    answer: 'No. If you can use WhatsApp, you can use Bizzness.',
  },
  {
    question: 'What if I only have one location?',
    answer: "That's exactly who this is built for — no complexity you don't need.",
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes — encrypted storage, and only you control who on your staff can see what.',
  },
  {
    question: 'What happens after the free trial?',
    answer:
      "You'll be asked to add a payment method to continue. No auto-charges without your confirmation.",
  },
  {
    question: 'Can I use it on my phone?',
    answer:
      'Yes. Bizzness works in your browser on any phone — handy when you are on the shop floor.',
  },
];

function MarketingButton({
  href,
  variant,
  children,
  className,
}: {
  href: string;
  variant: 'primary' | 'secondary' | 'accent';
  children: ReactNode;
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-sm font-semibold tracking-wide transition-colors duration-200';

  const styles = {
    primary: `bg-ink text-paper hover:bg-ink-light active:bg-ink-dark ${ui.focusRing} group`,
    secondary: `border border-border bg-transparent text-ink hover:border-ink hover:bg-paper ${ui.focusRing}`,
    accent: `bg-accent text-paper hover:bg-accent-dark active:bg-accent-dark ${ui.focusRing}`,
  };

  return (
    <Link href={href} className={cn(base, styles[variant], className)}>
      {variant === 'primary' && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-accent opacity-80 group-hover:opacity-100"
        />
      )}
      {children}
    </Link>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">{children}</p>
  );
}

function SectionDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[9px] uppercase tracking-[0.2em] text-muted/60">§</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function FeatureVisual({ type }: { type: (typeof FEATURES)[number]['visual'] }) {
  const cards: Record<typeof type, ReactNode> = {
    inventory: (
      <div className="space-y-2 p-4">
        {[
          { name: 'Sunflower oil 1L', stock: '2 left', tone: 'warning' },
          { name: 'Basmati rice 5kg', stock: 'In stock', tone: 'success' },
          { name: 'Fresh paneer 200g', stock: 'Out', tone: 'danger' },
        ].map((row) => (
          <div
            key={row.name}
            className={cn(
              'flex items-center justify-between rounded-lg border border-border border-l-4 bg-paper px-3 py-2 text-sm',
              row.tone === 'success' && 'border-l-success',
              row.tone === 'warning' && 'border-l-warning',
              row.tone === 'danger' && 'border-l-danger',
            )}
          >
            <span className="text-ink">{row.name}</span>
            <span
              className={cn(
                'text-xs font-medium',
                row.tone === 'success' && 'text-success',
                row.tone === 'warning' && 'text-warning',
                row.tone === 'danger' && 'text-danger',
              )}
            >
              {row.stock}
            </span>
          </div>
        ))}
      </div>
    ),
    billing: (
      <div className="p-4 font-mono text-xs">
        <div className="border-b border-dashed border-border pb-2 text-center text-[10px] uppercase tracking-widest text-muted">
          Tax invoice
        </div>
        <div className="mt-3 space-y-1 text-muted">
          <div className="flex justify-between">
            <span>Masala dosa ×2</span>
            <span className="tabular-data text-ink">₹180</span>
          </div>
          <div className="flex justify-between">
            <span>Filter coffee ×2</span>
            <span className="tabular-data text-ink">₹90</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold text-ink">
            <span>Total (incl. GST)</span>
            <span className="tabular-data">₹270</span>
          </div>
        </div>
        <p className="mt-3 text-center text-[10px] text-success">Paid · UPI · Logged</p>
      </div>
    ),
    staff: (
      <div className="space-y-2 p-4 text-sm">
        {[
          { who: 'Sneha R.', action: 'Billed ₹1,240', time: '2:14 pm' },
          { who: 'Amit P.', action: 'Adjusted stock', time: '11:05 am' },
          { who: 'You', action: 'Closed register', time: '9:48 pm' },
        ].map((row) => (
          <div
            key={row.who + row.time}
            className="flex items-center gap-3 rounded-lg border border-border bg-paper px-3 py-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted text-xs font-semibold text-accent-dark">
              {row.who.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{row.who}</p>
              <p className="text-xs text-muted">{row.action}</p>
            </div>
            <span className="text-xs text-muted">{row.time}</span>
          </div>
        ))}
      </div>
    ),
    sales: (
      <div className="p-4">
        <div className="flex items-end justify-between gap-1">
          {[35, 50, 42, 70, 58, 85, 62].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-accent/75"
              style={{ height: `${h}px` }}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Top seller</span>
            <span className="font-medium text-ink">Masala chai</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">This week</span>
            <span className="tabular-data font-medium text-ink">₹28,450</span>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="overflow-hidden rounded-panel border border-border bg-surface shadow-soft">
      {cards[type]}
    </div>
  );
}

export function MarketingLanding() {
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const primaryCta = user ? { href: '/dashboard', label: 'Go to Dashboard' } : { href: '/signup', label: 'Start Free for 90 Days' };
  const secondaryCta = user
    ? { href: '/sales/new', label: 'Record Sale' }
    : { href: '#how-it-works', label: 'See How It Works' };

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Subtle ledger grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.22]"
        style={{
          backgroundImage: `
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px',
        }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className={cn('flex items-center gap-2', ui.focusRing)}>
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface font-display text-sm font-bold text-ink">
              B
            </span>
            <span className="font-display text-lg font-semibold text-ink">Bizzness</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
            <a href="#features" className={cn('text-sm text-muted hover:text-ink', ui.focusRing)}>
              Features
            </a>
            <a href="#pricing" className={cn('text-sm text-muted hover:text-ink', ui.focusRing)}>
              Pricing
            </a>
            <a href="#faq" className={cn('text-sm text-muted hover:text-ink', ui.focusRing)}>
              FAQ
            </a>
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <MarketingButton href="/login" variant="secondary" className="px-4 py-2">
              Log In
            </MarketingButton>
            <MarketingButton href={user ? '/dashboard' : '/signup'} variant="primary" className="px-4 py-2">
              {user ? 'Dashboard' : 'Get Started'}
            </MarketingButton>
          </div>

          <button
            type="button"
            className={cn('rounded-lg border border-border bg-surface px-3 py-2 text-sm md:hidden', ui.focusRing)}
            aria-expanded={mobileNavOpen}
            aria-label="Toggle menu"
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            Menu
          </button>
        </div>

        {mobileNavOpen ? (
          <nav
            className="border-t border-border bg-surface px-4 py-4 md:hidden"
            aria-label="Mobile"
          >
            <div className="flex flex-col gap-3">
              <a href="#features" className="text-sm text-muted" onClick={() => setMobileNavOpen(false)}>
                Features
              </a>
              <a href="#pricing" className="text-sm text-muted" onClick={() => setMobileNavOpen(false)}>
                Pricing
              </a>
              <a href="#faq" className="text-sm text-muted" onClick={() => setMobileNavOpen(false)}>
                FAQ
              </a>
              <MarketingButton href="/login" variant="secondary" className="w-full">
                Log In
              </MarketingButton>
              <MarketingButton href={user ? '/dashboard' : '/signup'} variant="primary" className="w-full">
                {user ? 'Dashboard' : 'Get Started'}
              </MarketingButton>
            </div>
          </nav>
        ) : null}
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="relative">
              <Eyebrow>Built for Indian retail &amp; restaurants</Eyebrow>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.12] text-ink sm:text-5xl">
                Run your shop like it&apos;s already organized.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
                Track stock, bill customers, manage staff access, and see your sales — all from one
                screen. No spreadsheets, no guesswork.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <MarketingButton href={primaryCta.href} variant="primary">
                  {primaryCta.label}
                </MarketingButton>
                <MarketingButton href={secondaryCta.href} variant="secondary">
                  {secondaryCta.label}
                </MarketingButton>
              </div>
            </div>
            <DashboardPreview />
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-y border-border bg-surface/80 py-8" aria-label="Illustrative customers">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-center text-xs font-medium uppercase tracking-[0.16em] text-muted">
              Trusted by shop owners across Maharashtra
            </p>
            <p className="mt-1 text-center text-[10px] text-muted/70">
              Illustrative examples — representative of the shops we built this for
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {TRUST_SHOPS.map((name) => (
                <span
                  key={name}
                  className="font-display text-sm font-medium text-ink/70 sm:text-base"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
              Running a shop shouldn&apos;t mean three notebooks and a calculator.
            </h2>
          </div>
          <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            {PAIN_POINTS.map((item) => (
              <li
                key={item.text}
                className="rounded-panel border border-border bg-surface p-5 shadow-soft"
              >
                <item.icon className="h-5 w-5 text-accent" aria-hidden="true" />
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.text}</p>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-10 max-w-xl text-center font-display text-lg font-medium text-ink">
            Bizzness replaces all three with one simple screen.
          </p>
        </section>

        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <SectionDivider />
        </div>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-12 text-center">
            <Eyebrow>Features</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink">
              Everything a small shop needs. Nothing it doesn&apos;t.
            </h2>
          </div>
          <div className="space-y-16">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className={cn(
                  'grid items-center gap-8 lg:grid-cols-2 lg:gap-12',
                  index % 2 === 1 && 'lg:[&>*:first-child]:order-2',
                )}
              >
                <div>
                  <feature.icon className="h-6 w-6 text-accent" aria-hidden="true" />
                  <h3 className="mt-3 font-display text-2xl font-semibold text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted">{feature.body}</p>
                </div>
                <FeatureVisual type={feature.visual} />
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-y border-border bg-surface/60 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-semibold text-ink">
                Up and running before lunch service
              </h2>
            </div>
            <ol className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="relative rounded-panel border border-border bg-surface p-6 shadow-soft"
                >
                  <span
                    className="font-display text-3xl font-semibold text-accent/40"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 font-display text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-lg">
            <div className="relative overflow-hidden rounded-panel border border-border bg-surface p-8 shadow-soft sm:p-10">
              <VerifiedStamp className="absolute right-4 top-4 opacity-90" size={48} />
              <Eyebrow>Pricing</Eyebrow>
              <p className="tabular-data mt-4 font-display text-5xl font-semibold text-ink">
                ₹199
                <span className="text-lg font-sans font-medium text-muted">/month</span>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Everything included: inventory, billing, staff accounts, and sales reports. No
                per-user fees, no hidden charges.
              </p>
              <div className="mt-8">
                <MarketingButton href="/signup" variant="accent" className="w-full">
                  Start Your Free 90-Day Trial
                </MarketingButton>
                <p className="mt-3 text-center text-xs text-muted">
                  No credit card required · Cancel anytime · Your data stays yours
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mb-10 text-center">
            <Eyebrow>From shop floors</Eyebrow>
            <h2 className="mt-3 font-display text-2xl font-semibold text-ink">
              Illustrative stories from the kind of owners we built this for
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <blockquote
                key={t.name}
                className="flex flex-col rounded-panel border border-border bg-surface p-6 shadow-soft"
              >
                <p className="flex-1 text-sm leading-relaxed text-muted">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-paper font-semibold text-sm text-accent-dark"
                    aria-hidden="true"
                  >
                    {t.initials}
                  </span>
                  <div>
                    <cite className="not-italic text-sm font-semibold text-ink">{t.name}</cite>
                    <p className="text-xs text-muted">{t.shop}</p>
                    <p className="text-[10px] text-muted/70">Fictional illustrative example</p>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mb-8 text-center">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink">
              Common questions
            </h2>
          </div>
          <FaqAccordion items={FAQ_ITEMS} />
        </section>

        {/* Final CTA */}
        <section className="border-t border-border bg-ink py-16 text-paper sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Your shop, actually organized. Starting today.
            </h2>
            <div className="mt-8">
              <Link
                href={user ? '/dashboard' : '/signup'}
                className={cn(
                  'inline-flex items-center justify-center rounded-sm bg-accent px-8 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-accent-dark',
                  ui.focusRing,
                )}
              >
                {user ? 'Go to Dashboard' : 'Start Free for 90 Days'}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-paper font-display text-sm font-bold">
                B
              </span>
              <span className="font-display text-lg font-semibold">Bizzness</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted">
              Simple business management for Indian shops.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#features" className={cn('text-ink hover:text-accent-dark', ui.focusRing)}>
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className={cn('text-ink hover:text-accent-dark', ui.focusRing)}>
                  Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className={cn('text-ink hover:text-accent-dark', ui.focusRing)}>
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Contact</p>
            <p className="mt-3 text-sm text-muted">
              WhatsApp:{' '}
              <a
                href="https://wa.me/919876543210"
                className={cn('font-medium text-ink hover:text-accent-dark', ui.focusRing)}
              >
                +91 98765 43210
              </a>
            </p>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-border px-4 pt-6 sm:px-6">
          <p className="text-center text-xs text-muted">
            © {new Date().getFullYear()} Bizzness. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
