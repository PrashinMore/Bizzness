-- Migration: Add Outlets Support
-- This migration adds outlet support to the system

-- 1. Create outlets table
CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  address TEXT,
  "contactNumber" VARCHAR(20),
  "isActive" BOOLEAN DEFAULT true,
  "isPrimary" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 2. Add outletId to sales table
ALTER TABLE sale ADD COLUMN IF NOT EXISTS "outletId" UUID;

-- 3. Add outletId to expense table
ALTER TABLE expense ADD COLUMN IF NOT EXISTS "outletId" UUID;

-- 4. Create default outlets for existing organizations
-- This creates a "Main Outlet" for each existing organization
INSERT INTO outlets ("organizationId", name, "isPrimary", "isActive", "createdAt", "updatedAt")
SELECT 
  id as "organizationId",
  'Main Outlet' as name,
  true as "isPrimary",
  true as "isActive",
  now() as "createdAt",
  now() as "updatedAt"
FROM organizations
WHERE id NOT IN (SELECT DISTINCT "organizationId" FROM outlets WHERE "organizationId" IS NOT NULL);

-- 5. Backfill existing sales with default outlet
UPDATE sale
SET "outletId" = (
  SELECT o.id
  FROM outlets o
  WHERE o."organizationId" = sale."organizationId"
    AND o."isPrimary" = true
  LIMIT 1
)
WHERE "outletId" IS NULL;

-- 6. Backfill existing expenses with default outlet
UPDATE expense
SET "outletId" = (
  SELECT o.id
  FROM outlets o
  WHERE o."organizationId" = expense."organizationId"
    AND o."isPrimary" = true
  LIMIT 1
)
WHERE "outletId" IS NULL;

-- 7. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_outlets_organization_id ON outlets("organizationId");
CREATE INDEX IF NOT EXISTS idx_sales_outlet_id ON sale("outletId");
CREATE INDEX IF NOT EXISTS idx_expenses_outlet_id ON expense("outletId");

