# Migration Instructions: Making outletId Required for Sales

## Problem
The `outletId` column in the `sale` table needs to be made required (NOT NULL), but there are existing sales with NULL values in the database.

## Solution
Run the backfill migration script to assign outletIds to all existing sales before making the column required.

## Steps

1. **Run the backfill migration script:**
   ```bash
   npm run migrate:backfill-outlet-id
   ```

   This script will:
   - Find all sales with NULL outletId
   - Assign them to the primary outlet of their organization
   - Create default outlets for organizations that don't have any
   - Ensure all sales have an outletId

2. **After the migration completes successfully**, update the Sale entity to make outletId required:

   In `be/src/sales/entities/sale.entity.ts`, change:
   ```typescript
   @ManyToOne(() => Outlet, { nullable: true, onDelete: 'CASCADE' })
   outlet?: Outlet | null;

   @Column({ type: 'uuid', nullable: true })
   outletId?: string | null;
   ```
   
   Back to:
   ```typescript
   @ManyToOne(() => Outlet, { nullable: false, onDelete: 'CASCADE' })
   outlet!: Outlet;

   @Column({ type: 'uuid' })
   outletId!: string;
   ```

3. **Restart your NestJS application** - TypeORM will now sync the schema and make the column NOT NULL.

## Verification

After running the migration, verify that all sales have an outletId:
```sql
SELECT COUNT(*) FROM sale WHERE "outletId" IS NULL;
```
This should return 0.

## Notes

- The migration script is idempotent - it's safe to run multiple times
- If an organization has no outlets, the script will create a default "Main Outlet"
- The script uses the primary outlet for each organization, or the first active outlet if no primary exists

