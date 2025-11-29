-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create global_products table
CREATE TABLE IF NOT EXISTS global_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    aliases TEXT[] DEFAULT '{}',
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create trigram indexes for fast fuzzy search
-- These indexes make similarity searches extremely fast
CREATE INDEX IF NOT EXISTS idx_global_products_name_trgm
ON global_products
USING gin (name gin_trgm_ops);

-- Note: Cannot create trigram index directly on text[] array
-- We'll search aliases by unnesting them in queries instead
-- CREATE INDEX IF NOT EXISTS idx_global_products_aliases_trgm
-- ON global_products
-- USING gin (aliases gin_trgm_ops);

-- Create trigram index for product table (TypeORM uses lowercase class name by default)
-- Note: If your table is named differently, adjust this accordingly
DO $$
BEGIN
    -- Try to create index on 'product' table (TypeORM default)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product') THEN
        CREATE INDEX IF NOT EXISTS idx_product_name_trgm ON product USING gin (name gin_trgm_ops);
    END IF;
    -- Also try 'products' in case it was created with a different naming strategy
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
    END IF;
END $$;

-- Insert some example global products (optional - you can customize these)
INSERT INTO global_products (name, category, aliases) VALUES
('Cold Coffee', 'Beverages', '{"iced coffee","cafe frappe","cold brew"}'),
('Cold Brew', 'Beverages', '{"cold brew coffee","iced coffee"}'),
('Veg Sandwich', 'Snacks', '{"veg sandwitch","vegetable sandwich","veggie sandwich"}'),
('Chicken Sandwich', 'Snacks', '{"chicken sandwitch","chicken burger"}'),
('Pizza Margherita', 'Main Course', '{"margherita pizza","margarita pizza"}'),
('Pasta Carbonara', 'Main Course', '{"carbonara pasta","spaghetti carbonara"}'),
('Caesar Salad', 'Salads', '{"caesar salad","cesar salad"}'),
('French Fries', 'Snacks', '{"fries","potato fries"}'),
('Chocolate Cake', 'Desserts', '{"choco cake","chocolate cake slice"}'),
('Ice Cream', 'Desserts', '{"icecream","gelato"}')
ON CONFLICT DO NOTHING;

