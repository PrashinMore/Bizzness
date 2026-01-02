Perfect — let’s go **purely technical** and implementation-oriented.
I’ll structure this like an **internal engineering doc** so it’s directly usable while building.

---

# Outlet Management – Technical Implementation Guide

Target stack (assumed from context):

* **Backend**: Node.js + TypeScript + TypeORM + Postgres
* **Frontend**: React / React Native
* **Auth**: JWT
* **Multi-tenant**: Organization-based (already present)

---

## 1. Core Design Decisions (Lock These First)

### 1.1 Tenant Hierarchy (Non-negotiable)

```
Organization → Outlet → Operational Data
```

Every operational record MUST contain:

```ts
organizationId
outletId
```

This avoids:

* Data leakage
* Complex joins later
* Future migration nightmares

---

### 1.2 Shared vs Outlet-Scoped Data

| Entity           | organizationId | outletId |
| ---------------- | -------------- | -------- |
| Organization     | ✅              | ❌        |
| Outlet           | ✅              | ❌        |
| Product          | ✅              | ❌        |
| Inventory        | ✅              | ✅        |
| Sale / Bill      | ✅              | ✅        |
| Expense          | ✅              | ✅        |
| Staff Assignment | ✅              | ✅        |

---

## 2. Database Schema (Backend)

### 2.1 Outlet Entity

```ts
@Entity()
export class Outlet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  organization: Organization;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 20, nullable: true })
  contactNumber?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPrimary: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

### 2.2 Inventory (Outlet-Scoped)

```ts
@Entity()
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  outletId: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'int', default: 0 })
  quantity: number;
}
```

---

### 2.3 Sales / Bills

```ts
@Entity()
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  outletId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## 3. Auth & Context Injection (Very Important)

### 3.1 JWT Payload

```json
{
  "userId": "...",
  "organizationId": "...",
  "outletIds": ["outlet-1", "outlet-2"],
  "role": "OWNER"
}
```

> ❌ Do NOT hardcode outletId in JWT
> ✅ Outlet context comes from request header

---

### 3.2 Outlet Context via Header

**Frontend sends on every request:**

```
X-Outlet-Id: <uuid>
```

---

### 3.3 Backend Guard (NestJS-style example)

```ts
@Injectable()
export class OutletGuard {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const outletId = req.headers['x-outlet-id'];

    if (!outletId) throw new BadRequestException('Outlet not selected');

    if (!req.user.outletIds.includes(outletId))
      throw new ForbiddenException();

    req.outletId = outletId;
    return true;
  }
}
```

Attach this guard to:

* Sales
* Inventory
* Expenses
* Reports

---

## 4. API Design

### 4.1 Outlet APIs

```http
GET    /outlets
POST   /outlets
PATCH  /outlets/:id
PATCH  /outlets/:id/disable
```

---

### 4.2 Inventory APIs (Outlet-Aware)

```http
GET  /inventory
POST /inventory/adjust
```

Backend automatically injects:

```ts
organizationId = req.user.organizationId
outletId = req.outletId
```

---

### 4.3 Sales Creation

```http
POST /sales
Headers:
X-Outlet-Id: outlet-uuid
```

---

## 5. Frontend Implementation

### 5.1 Outlet Selector (Global)

**State shape:**

```ts
{
  selectedOutlet: {
    id: string;
    name: string;
  }
}
```

Store in:

* Zustand / Redux / Context
* Persist in `localStorage`

---

### 5.2 Axios / Fetch Interceptor

```ts
axios.interceptors.request.use(config => {
  const outletId = getSelectedOutletId();
  if (outletId) {
    config.headers['X-Outlet-Id'] = outletId;
  }
  return config;
});
```

---

### 5.3 Default Outlet Logic

On login:

1. Fetch `/outlets`
2. If only 1 outlet → auto-select
3. If multiple → show selector modal

---

## 6. First-Time Organization Setup

When creating organization:

```ts
await outletRepo.save({
  organizationId,
  name: 'Main Outlet',
  isPrimary: true
});
```

This ensures:

* Zero breaking changes for single-outlet users
* Outlet module is invisible by default

---

## 7. Data Isolation Rules (Must Enforce)

Every query MUST include:

```sql
WHERE organization_id = :orgId
AND outlet_id = :outletId
```

❌ Never trust frontend filters
✅ Always enforce in backend

---

## 8. Migration Strategy (Existing Users)

If users already exist:

1. Create default outlet
2. Backfill:

```sql
UPDATE sales SET outlet_id = '<default-outlet-id>';
UPDATE inventory SET outlet_id = '<default-outlet-id>';
```

---

## 9. Feature Flags (SaaS Ready)

Add to `organization_settings`:

```json
{
  "multiOutletEnabled": false,
  "maxOutlets": 1
}
```

Use this to:

* Lock outlet creation
* Build pricing tiers later

---

## 10. Common Pitfalls (Avoid These)

❌ Outlet-specific products
❌ OutletId stored in JWT
❌ Client-side filtering only
❌ Hard deleting outlets (always soft disable)

---

## 11. Build Order (Practical)

1. Outlet entity + APIs
2. Outlet selector (frontend)
3. Outlet guard (backend)
4. Inventory outlet scoping
5. Sales outlet scoping
6. Reports aggregation

---

## 12. Outcome If Done Right

* Clean multi-tenant SaaS
* Zero rework later
* Ready for:

  * Chains
  * Franchises
  * POS integrations
  * Paid plans

---

If you want next, I can:

* Write **exact SQL migrations**
* Design **ER diagram**
* Create **PRD / Jira tickets**
* Help you **refactor existing modules to be outlet-safe**

Just say the word.
