/*
# Create orders and ratings workspace tables

1. New Tables
- `inventory_orders` — customer order records with order number, customer, item count, total, and fulfillment status.
- `inventory_ratings` — product feedback with customer name, star rating, review text, and product reference.

2. Security
- Enable row level security on both tables.
- Grant CRUD access to anon and authenticated because this is a shared showroom workspace with no sign-in screen.
- Add separate policies for each CRUD operation on both tables.

3. Important notes
- Ratings are constrained to one through five stars.
- Orders are constrained to the supported fulfillment statuses used by the workspace.
- Product references are kept intact when a product is removed by setting the rating product reference to null.
*/

CREATE TABLE IF NOT EXISTS inventory_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  items_count integer NOT NULL DEFAULT 1 CHECK (items_count > 0),
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status text NOT NULL DEFAULT 'Processing' CHECK (status IN ('Processing', 'Ready', 'Completed', 'Cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES inventory_products(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ratings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_orders TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_ratings TO anon, authenticated;

DROP POLICY IF EXISTS "Shared workspace can read orders" ON inventory_orders;
CREATE POLICY "Shared workspace can read orders" ON inventory_orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Shared workspace can add orders" ON inventory_orders;
CREATE POLICY "Shared workspace can add orders" ON inventory_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Shared workspace can update orders" ON inventory_orders;
CREATE POLICY "Shared workspace can update orders" ON inventory_orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Shared workspace can delete orders" ON inventory_orders;
CREATE POLICY "Shared workspace can delete orders" ON inventory_orders FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Shared workspace can read ratings" ON inventory_ratings;
CREATE POLICY "Shared workspace can read ratings" ON inventory_ratings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Shared workspace can add ratings" ON inventory_ratings;
CREATE POLICY "Shared workspace can add ratings" ON inventory_ratings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Shared workspace can update ratings" ON inventory_ratings;
CREATE POLICY "Shared workspace can update ratings" ON inventory_ratings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Shared workspace can delete ratings" ON inventory_ratings;
CREATE POLICY "Shared workspace can delete ratings" ON inventory_ratings FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS inventory_orders_created_at_idx ON inventory_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_ratings_product_idx ON inventory_ratings(product_id);
