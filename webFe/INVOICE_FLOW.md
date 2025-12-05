Nice — below is a complete, SaaS-ready **technical implementation** for the **Invoice Module** tailored to a multi-tenant restaurant/cafe POS. I include DB schema, concurrency-safe invoice numbering, API design, backend flow (sync + recommended async), PDF generation, storage, frontend preview/print, configuration options, security, migration SQL, and test ideas. I’ll give runnable code snippets for NestJS + TypeORM and React where it helps.

# Invoice module - high level

Goal: reliable, configurable invoice creation per **organization** and **branch**, with PDF generation, storage, retrieval, and printing. Must support:

* GST & tax breakdowns (configurable)
* Org/branch prefixes and reset policies (monthly/yearly/never)
* Multi-tenant isolation
* Auditability and idempotency
* Share (WhatsApp/email) and download

---

# Key design decisions (summary)

* **Per-organization configuration** for invoice behaviour (enable/disable GST, format, prefix, reset cycle, PDF options).
* **Concurrency-safe numbering** using a per-org counter row with `SELECT ... FOR UPDATE` or PostgreSQL sequences scoped per org.
* **Store invoice metadata** in DB, store PDF in object storage (S3/R2/Supabase) and keep `pdf_url`.
* **PDF generation** via Puppeteer rendering an HTML template (recommended) — perform generation in a background job queue (BullMQ/Redis) and return immediate invoice metadata. Optionally support synchronous generation for small installs.
* **Create invoice from bill** endpoint (idempotent) — link invoice ← billing_session.
* **Permissions**: only org users with invoice permission can create/download.
* **Versioning**: store the rendered HTML snapshot (or hash) for audit if needed.

---

# Database schema (Postgres, TypeORM-friendly)

### `organizations` (existing)

Keep org-level config in `organization_invoice_settings` below.

### `branches` (existing)

Each branch may have its own invoice numbering if desired.

### `organization_invoice_settings`

Stores invoice preferences.

```sql
CREATE TABLE organization_invoice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id),
  enable_invoices boolean DEFAULT true,
  gst_enabled boolean DEFAULT false,
  invoice_prefix text DEFAULT 'INV',
  invoice_branch_prefix boolean DEFAULT true,
  invoice_reset_cycle text DEFAULT 'monthly', -- 'never' | 'monthly' | 'yearly'
  invoice_padding int DEFAULT 5,               -- serial digits
  invoice_display_format text DEFAULT 'A4',    -- 'A4' | 'thermal'
  include_logo boolean DEFAULT true,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### `invoice_counters` (for safe serials per org+period)

We use this when `invoice_reset_cycle` != 'never'.

```sql
CREATE TABLE invoice_counters (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  branch_id uuid, -- nullable if counting per org
  period text NOT NULL, -- e.g., '2025-11' or '2025'
  last_serial int NOT NULL DEFAULT 0,
  UNIQUE (organization_id, branch_id, period)
);
```

### `invoices`

Main invoice record.

```sql
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  branch_id uuid REFERENCES branches(id),
  billing_session_id uuid REFERENCES billing_sessions(id) UNIQUE, -- 1:1
  invoice_number text NOT NULL,
  invoice_prefix text NOT NULL,
  invoice_serial int NOT NULL,
  invoice_period text,
  customer_name text,
  customer_phone text,
  customer_gstin text,
  items jsonb NOT NULL, -- snapshot of items [{productId,name,qty,rate,total,tax}] 
  subtotal numeric(12,2) NOT NULL,
  tax_amount numeric(12,2) DEFAULT 0,
  discount_amount numeric(12,2) DEFAULT 0,
  total numeric(12,2) NOT NULL,
  pdf_url text,
  html_snapshot text, -- optional
  created_by uuid, -- user id
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, invoice_number)
);
```

> Note: `billing_session_id` unique ensures each bill maps to at most one invoice. Use DB constraint to enforce idempotency.

---

# Invoice numbering algorithm (concurrency-safe)

Two options:

### Option 1 — Per-org counter row with transaction locking (recommended for predictable numbering)

1. Build the `period` string based on `invoice_reset_cycle`:

   * monthly -> `YYYY-MM`
   * yearly -> `YYYY`
   * never -> fixed period `'global'`
2. Begin DB transaction.
3. `SELECT last_serial FROM invoice_counters WHERE organization_id = $org AND branch_id = $branch AND period = $period FOR UPDATE;`

   * If not exists -> `INSERT ... last_serial = 1` (new row).
   * Else increment `last_serial = last_serial + 1`, `UPDATE`.
4. Commit transaction.
5. Compose invoice_number: `${prefix}-${branchPrefix?branchCode:''}-${period}-${pad(serial)}`

This avoids race conditions because `FOR UPDATE` locks the counter row.

### Option 2 — PostgreSQL sequences per org (fast but needs sequence creation on-the-fly)

* Create `invoice_seq_{org_id}` sequence when organization created.
* Use `nextval` and optionally reset via `ALTER SEQUENCE` on reset cycle.
* Harder to reset by month without more control.

I’ll show Option 1 implementation snippet below.

---

# Backend: API design (REST)

### POST `/api/orgs/:orgId/invoices/from-bill/:billId`

* Creates an invoice from a completed billing session.
* Body (optional): `{ customer_name, customer_phone, customer_gstin, forceSyncPdf: boolean }`
* Response: `201 { invoice: {...metadata}, status: 'queued'|'ready', pdf_url? }`
* Idempotent: will return existing invoice if `billing_session_id` already mapped.

### GET `/api/orgs/:orgId/invoices/:invoiceId`

* Returns invoice metadata and `pdf_url` if ready.

### GET `/api/orgs/:orgId/invoices/:invoiceId/pdf`

* Streams PDF or redirects to storage URL (signed URL if private).

### GET `/api/orgs/:orgId/invoices?from=&to=&branch=&customer=&page=&size=`

* List invoices for reporting.

### POST `/api/admin/:orgId/settings/invoice` (org admin)

* Update `organization_invoice_settings`.

---

# Backend flow (recommended)

1. Client calls `POST /invoices/from-bill/:billId`.
2. Server:

   * Validate billing session is `completed`. If not, reject.
   * Check org settings, permissions.
   * Start DB transaction:

     * Check if invoice already exists for this `billing_session_id`. If yes: return it (idempotent).
     * Determine `period` as per settings.
     * Lock/insert `invoice_counters` row `FOR UPDATE` and increment `last_serial`.
     * Compose `invoice_number` and insert `invoices` record with `pdf_url=null`, `html_snapshot` = generated HTML string.
   * Commit DB transaction.
3. Enqueue background job with invoice id for PDF generation (preferred).
4. Respond to client with invoice metadata and `status: queued`.
5. Worker picks job:

   * Render HTML template (using `invoices` record data).
   * Use Puppeteer to generate PDF Buffer.
   * Upload to object storage (S3 / Supabase). Get `pdf_url`.
   * Update `invoices.pdf_url` and `invoices.updated_at`.
   * Emit event/webhook `invoice.generated` if configured.

**Alternative:** synchronous generate PDF before committing and return `status: ready`. Simpler for single-tenant but may block the request and time out under load.

---

# PDF generation (Puppeteer) — sample (Node)

```ts
// invoice-pdf-generator.ts
import puppeteer from 'puppeteer';

export async function renderInvoicePdf(html: string) {
  const browser = await puppeteer.launch({ headless: 'new', args:['--no-sandbox','--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    await page.setContent(html, {waitUntil: 'networkidle0'});
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {top: '20px', bottom: '20px', left: '10px', right: '10px'}
    });
    return pdf; // Buffer
  } finally {
    await browser.close();
  }
}
```

Render HTML using a templating engine (Handlebars/EJS/React Server-Side render) to include logo, tax table, footer, QR code for UPI etc.

---

# Storage options

* **S3 / Minio / R2 / Supabase**: store PDF as `invoices/{orgId}/{invoice_number}.pdf`. Prefer private buckets with pre-signed URLs for sharing.
* Store `pdf_url` in DB as signed URL expiry timestamp or store object key and generate signed URL on GET.

---

# NestJS + TypeORM example (core parts)

### Invoice entity (TypeORM simplified)

```ts
@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() organizationId: string;
  @Column({ nullable: true }) branchId?: string;
  @Column() billingSessionId: string;
  @Column() invoiceNumber: string;
  @Column() invoicePrefix: string;
  @Column('int') invoiceSerial: number;
  @Column() invoicePeriod: string;

  @Column('jsonb') items: any;
  @Column('decimal', { precision: 12, scale: 2 }) subtotal: number;
  @Column('decimal', { precision: 12, scale: 2 }) taxAmount: number;
  @Column('decimal', { precision: 12, scale: 2 }) total: number;

  @Column({ nullable: true }) pdfUrl?: string;
  @Column({ type: 'text', nullable: true }) htmlSnapshot?: string;

  @Column() createdBy: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

### Service: createFromBill (pseudo-code)

```ts
async createFromBill(orgId: string, branchId: string|null, billId: string, payload) {
  // 1. load bill, validate completed
  const bill = await this.billingRepo.findOne(billId);
  if(!bill || bill.status !== 'completed') throw new BadRequest('bill not ready');

  // 2. check existing invoice
  const existing = await this.invoiceRepo.findOne({ where: { billingSessionId: billId }});
  if(existing) return existing;

  // 3. compute period based on org settings
  const settings = await this.settingsRepo.findOne({ organizationId: orgId });
  const period = computePeriod(settings.invoice_reset_cycle);

  // 4. In transaction: lock or insert invoice_counters
  return await this.dataSource.transaction(async manager => {
    let counter = await manager.getRepository(InvoiceCounter)
      .createQueryBuilder('ic')
      .setLock('pessimistic_write')
      .where('ic.organization_id = :org AND ic.branch_id IS NOT DISTINCT FROM :branch AND ic.period = :period',
             { org: orgId, branch: branchId, period })
      .getOne();

    if(!counter) {
      counter = manager.getRepository(InvoiceCounter).create({ organizationId: orgId, branchId: branchId, period, lastSerial: 1 });
      await manager.save(counter);
      serial = 1;
    } else {
      counter.lastSerial += 1;
      await manager.save(counter);
      serial = counter.lastSerial;
    }

    const invoiceNumber = composeInvoiceNumber(settings, branchId, period, serial);

    const invoice = manager.getRepository(Invoice).create({
      organizationId: orgId,
      branchId,
      billingSessionId: billId,
      invoiceNumber,
      invoicePrefix: settings.invoice_prefix,
      invoiceSerial: serial,
      invoicePeriod: period,
      items: bill.itemsSnapshot,
      subtotal: bill.subtotal,
      taxAmount: bill.taxAmount,
      total: bill.total,
      createdBy: payload.userId,
      htmlSnapshot: renderHtmlSnapshot(...),
    });

    await manager.save(invoice);

    // optionally enqueue background job
    await this.queue.add('generate-invoice-pdf', { invoiceId: invoice.id });
    return invoice;
  });
}
```

---

# Frontend — React invoice UX

Two components:

1. Admin: Organization settings page (invoice formatting)
2. POS: After checkout → "Generate Invoice" / "View Invoice" / "Print" / "Download"

### POS flow

* Checkout completes → client POST `/invoices/from-bill/:id`
* Server returns invoice metadata `{ id, invoiceNumber, status:'queued' }`
* Poll invoice status or listen to websocket push for `status: ready`
* When `pdf_url` available show:

  * View (open pdf_url in new tab)
  * Download
  * Print (open pdf in new tab and call `window.print()`)

### Quick React preview (open HTML)

If you store `htmlSnapshot`, you can show an HTML preview in-app (styled for A4) prior to PDF being ready.

---

# Sync vs Async PDF generation — tradeoffs

* **Synchronous** (render PDF in request):

  * Simpler for small installs.
  * Pros: immediate PDF ready.
  * Cons: request latency; risk of timeouts; poor scale.
* **Asynchronous** (recommended for SaaS):

  * Enqueue job; respond immediately with metadata.
  * Worker generates PDF and uploads; update DB; notify client via websocket/webhook.
  * Better scalability and resilience.

Design recommendation: support both — for orgs with `plan: free` use synchronous small PDFs; for paid use background worker.

---

# Webhooks & integrations

Emit event `invoice.created` and `invoice.generated` for:

* External accounting integrations (Tally, Zoho Books)
* Merchant webhooks (configurable)
* Internal audit pipelines

Payload should include invoice id, invoice number, pdf_url, billing_session_id, totals.

---

# Permissions & security

* Only users with `INVOICE_CREATE` role can call create endpoint.
* Signed URLs for `pdf_url` should expire (e.g., 24h) unless the org chooses public storage.
* Rate-limit invoice creation endpoints to prevent abuse.
* Sanitize HTML snapshots to avoid XSS if previewed.

---

# Backup & retention

* Keep `html_snapshot` and JSON `items` for audit.
* Optionally keep PDFs for X months based on organizational plan and regulatory needs.
* Provide export endpoint for accounting CSV/JSON.

---

# Migration SQL snippets

```sql
-- settings table
CREATE TABLE organization_invoice_settings (...);

-- counters
CREATE TABLE invoice_counters (...);

-- invoices
CREATE TABLE invoices (...);
```

(See definitions earlier — paste into migration files.)

---

# Testing & QA checklist

* Concurrency test: simulate 100 parallel invoice creates for same org and ensure serials are unique and sequential.
* Idempotency test: re-request invoice creation for same bill returns same invoice.
* Edge cases: tax rounding, discounts, negative line items (returns/credit notes handled separately).
* PDF rendering test: logos, long product names, long customer addresses, multi-page invoices.
* Permissions test: unauthorized users cannot create/download.

---

# Extras (useful SaaS features)

* **Invoice templates**: let orgs choose templates (compact, classic, thermal) and preview.
* **Credit notes / returns**: separate module mapping to invoice.
* **Bulk invoice export**: CSV / ZIP of PDFs for accounting.
* **Invoice drafts**: create but do not number until finalized.
* **Multi-currency** and currency formatting support for chains operating across regions.

---

# Example: invoice_number composition

Given:

* prefix = `CAFEBAR`
* branchCode = `GW` (Gopi West)
* period = `2025-11`
* serial = `12`
* padding = 5

Result:
`CAFEBAR-GW-2025-11-00012`

If `invoice_branch_prefix=false`, then: `CAFEBAR-2025-11-00012`

---

# Quick checklist for you to implement now

1. Add `organization_invoice_settings` table + admin UI to configure.
2. Add `invoice_counters` + `invoices` tables + migrations.
3. Implement `POST /invoices/from-bill/:billId` with transaction + counter lock.
4. Add background worker (BullMQ + Redis) to generate PDFs with Puppeteer and upload to S3.
5. Add webhooks and websocket notifications for invoice ready event.
6. Add POS UI: generate invoice button, preview, download, print.
7. Add tests: concurrency, idempotency, rendering.

---

If you want I can now:

* generate the full NestJS service + controller + migration files for this (ready-to-paste),
* OR produce the React components (POS + admin settings + preview),
* OR produce a ready-to-render Handlebars A4 HTML invoice template (with GST table & QR) plus Puppeteer code.

Which of these should I produce next?
