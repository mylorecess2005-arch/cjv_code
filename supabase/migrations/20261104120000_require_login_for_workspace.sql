CREATE TABLE IF NOT EXISTS public.login_gate_attempts (
  ip_hash text PRIMARY KEY CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz
);

ALTER TABLE public.login_gate_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_gate_attempts FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_gate_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.consume_login_gate_attempt(p_ip_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  allowed boolean;
BEGIN
  IF p_ip_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid login attempt key';
  END IF;

  INSERT INTO public.login_gate_attempts AS attempts (
    ip_hash,
    attempts,
    window_started_at,
    blocked_until
  )
  VALUES (p_ip_hash, 1, now(), NULL)
  ON CONFLICT (ip_hash) DO UPDATE
  SET
    attempts = CASE
      WHEN attempts.window_started_at <= now() - interval '15 minutes'
        OR attempts.blocked_until <= now()
        THEN 1
      WHEN attempts.blocked_until IS NOT NULL
        THEN attempts.attempts
      ELSE attempts.attempts + 1
    END,
    window_started_at = CASE
      WHEN attempts.window_started_at <= now() - interval '15 minutes'
        OR attempts.blocked_until <= now()
        THEN now()
      ELSE attempts.window_started_at
    END,
    blocked_until = CASE
      WHEN attempts.blocked_until > now()
        THEN attempts.blocked_until
      WHEN attempts.window_started_at <= now() - interval '15 minutes'
        OR attempts.blocked_until <= now()
        THEN NULL
      WHEN attempts.attempts + 1 >= 5
        THEN now() + interval '15 minutes'
      ELSE NULL
    END
  RETURNING blocked_until IS NULL INTO allowed;

  RETURN allowed;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_login_gate_attempt(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_login_gate_attempt(text) TO service_role;

REVOKE ALL ON public.inventory_products, public.inventory_movements, public.inventory_scans,
  public.inventory_orders, public.inventory_ratings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_products, public.inventory_movements,
  public.inventory_scans, public.inventory_orders, public.inventory_ratings TO authenticated;

DROP POLICY IF EXISTS "Shared workspace can read products" ON public.inventory_products;
DROP POLICY IF EXISTS "Shared workspace can add products" ON public.inventory_products;
DROP POLICY IF EXISTS "Shared workspace can update products" ON public.inventory_products;
DROP POLICY IF EXISTS "Shared workspace can delete products" ON public.inventory_products;
DROP POLICY IF EXISTS "Authenticated workspace access" ON public.inventory_products;
CREATE POLICY "Authenticated workspace access" ON public.inventory_products
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'workspace_access') = 'cjv')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'workspace_access') = 'cjv');

DROP POLICY IF EXISTS "Shared workspace can read movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Shared workspace can add movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Shared workspace can update movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Shared workspace can delete movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Authenticated workspace access" ON public.inventory_movements;
CREATE POLICY "Authenticated workspace access" ON public.inventory_movements
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'workspace_access') = 'cjv')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'workspace_access') = 'cjv');

DROP POLICY IF EXISTS "Shared workspace can read scans" ON public.inventory_scans;
DROP POLICY IF EXISTS "Shared workspace can add scans" ON public.inventory_scans;
DROP POLICY IF EXISTS "Shared workspace can update scans" ON public.inventory_scans;
DROP POLICY IF EXISTS "Shared workspace can delete scans" ON public.inventory_scans;
DROP POLICY IF EXISTS "Authenticated workspace access" ON public.inventory_scans;
CREATE POLICY "Authenticated workspace access" ON public.inventory_scans
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'workspace_access') = 'cjv')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'workspace_access') = 'cjv');

DROP POLICY IF EXISTS "Shared workspace can read orders" ON public.inventory_orders;
DROP POLICY IF EXISTS "Shared workspace can add orders" ON public.inventory_orders;
DROP POLICY IF EXISTS "Shared workspace can update orders" ON public.inventory_orders;
DROP POLICY IF EXISTS "Shared workspace can delete orders" ON public.inventory_orders;
DROP POLICY IF EXISTS "Authenticated workspace access" ON public.inventory_orders;
CREATE POLICY "Authenticated workspace access" ON public.inventory_orders
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'workspace_access') = 'cjv')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'workspace_access') = 'cjv');

DROP POLICY IF EXISTS "Shared workspace can read ratings" ON public.inventory_ratings;
DROP POLICY IF EXISTS "Shared workspace can add ratings" ON public.inventory_ratings;
DROP POLICY IF EXISTS "Shared workspace can update ratings" ON public.inventory_ratings;
DROP POLICY IF EXISTS "Shared workspace can delete ratings" ON public.inventory_ratings;
DROP POLICY IF EXISTS "Authenticated workspace access" ON public.inventory_ratings;
CREATE POLICY "Authenticated workspace access" ON public.inventory_ratings
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'workspace_access') = 'cjv')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'workspace_access') = 'cjv');
