import { VerifiedStamp } from './verified-stamp';

export function DashboardPreview() {
  return (
    <div className="relative">
      <VerifiedStamp
        className="landing-stamp absolute -right-3 -top-3 z-10 hidden sm:block"
        size={56}
      />
      <div className="overflow-hidden rounded-panel border border-border bg-surface shadow-lifted">
        <div className="flex items-center gap-2 border-b border-border bg-paper px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-danger/70" />
          <span className="h-2 w-2 rounded-full bg-warning/70" />
          <span className="h-2 w-2 rounded-full bg-success/70" />
          <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            Bizzness · Today
          </span>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <div className="rounded-lg border border-border bg-paper p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Today&apos;s sales
            </p>
            <p className="tabular-data mt-1 font-display text-2xl font-semibold text-ink">
              ₹4,280
            </p>
            <p className="mt-1 text-xs text-muted">18 orders</p>
          </div>
          <div className="rounded-lg border border-border border-l-4 border-l-warning bg-warning-muted/40 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Low stock
            </p>
            <p className="tabular-data mt-1 font-display text-2xl font-semibold text-warning">
              3 items
            </p>
            <p className="mt-1 text-xs text-muted">Cooking oil, atta, paneer</p>
          </div>
          <div className="rounded-lg border border-border bg-paper p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Net profit
            </p>
            <p className="tabular-data mt-1 font-display text-2xl font-semibold text-success">
              ₹1,140
            </p>
            <p className="mt-1 text-xs text-muted">After expenses</p>
          </div>
        </div>

        <div className="border-t border-border px-4 py-3 sm:px-5">
          <div className="flex items-end justify-between gap-2">
            {[40, 65, 55, 80, 72, 90, 68].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-accent/80"
                style={{ height: `${h}px` }}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] uppercase tracking-[0.14em] text-muted">
            Sales this week
          </p>
        </div>
      </div>
    </div>
  );
}
