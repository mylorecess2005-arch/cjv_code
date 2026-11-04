/*
# Create inventory workspace tables

1. New Tables
- `inventory_products` — catalog records for bags and watches, including SKU, category, quantity, value, and verification metadata.
- `inventory_movements` — stock-in and stock-out events that update the catalog quantity through the app.
- `inventory_scans` — camera verification sessions with counted units and discrepancy status.

2. Security
- Enable row level security on all three tables.
- Grant CRUD access to anon and authenticated because this first version is a shared, single-location workspace with no sign-in screen.
- Add separate policies for each CRUD operation on every table.

3. Important notes
- Quantities are integer counts and cannot be negative.
- Prices are stored as numeric values in the database.
- Scan results preserve expected quantity, detected quantity, and discrepancy information for reporting.
*/

CREATE TABLE IF NOT EXISTS inventory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Bags', 'Watches')),
  brand text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  status text NOT NULL DEFAULT 'In stock' CHECK (status IN ('In stock', 'Low stock', 'Out of stock')),
  last_verified_at timestamptz,
  image_tone text NOT NULL DEFAULT 'sand',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('Stock in', 'Stock out')),
  quantity integer NOT NULL CHECK (quantity > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Camera verification',
  location text NOT NULL DEFAULT 'Main showroom',
  expected_count integer NOT NULL DEFAULT 0 CHECK (expected_count >= 0),
  detected_count integer NOT NULL DEFAULT 0 CHECK (detected_count >= 0),
  discrepancy integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Matched', 'Review', 'Pending')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_scans ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_products TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_movements TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_scans TO anon, authenticated;

DROP POLICY IF EXISTS "Shared workspace can read products" ON inventory_products;
CREATE POLICY "Shared workspace can read products" ON inventory_products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Shared workspace can add products" ON inventory_products;
CREATE POLICY "Shared workspace can add products" ON inventory_products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Shared workspace can update products" ON inventory_products;
CREATE POLICY "Shared workspace can update products" ON inventory_products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Shared workspace can delete products" ON inventory_products;
CREATE POLICY "Shared workspace can delete products" ON inventory_products FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Shared workspace can read movements" ON inventory_movements;
CREATE POLICY "Shared workspace can read movements" ON inventory_movements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Shared workspace can add movements" ON inventory_movements;
CREATE POLICY "Shared workspace can add movements" ON inventory_movements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Shared workspace can update movements" ON inventory_movements;
CREATE POLICY "Shared workspace can update movements" ON inventory_movements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Shared workspace can delete movements" ON inventory_movements;
CREATE POLICY "Shared workspace can delete movements" ON inventory_movements FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Shared workspace can read scans" ON inventory_scans;
CREATE POLICY "Shared workspace can read scans" ON inventory_scans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Shared workspace can add scans" ON inventory_scans;
CREATE POLICY "Shared workspace can add scans" ON inventory_scans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Shared workspace can update scans" ON inventory_scans;
CREATE POLICY "Shared workspace can update scans" ON inventory_scans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Shared workspace can delete scans" ON inventory_scans;
CREATE POLICY "Shared workspace can delete scans" ON inventory_scans FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS inventory_products_category_idx ON inventory_products(category);
CREATE INDEX IF NOT EXISTS inventory_movements_product_idx ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS inventory_scans_created_at_idx ON inventory_scans(created_at DESC);
