-- Defense-in-depth for checkout price integrity.

CREATE OR REPLACE FUNCTION public.resolve_authoritative_order_price(
  _order_table text,
  _game_name text,
  _package_name text,
  _g2bulk_product_id text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric;
BEGIN
  IF _order_table = 'preorder_orders' THEN
    SELECT p.price
      INTO v_price
      FROM public.preorder_packages p
      JOIN public.games g ON g.id = p.game_id
     WHERE p.name = _package_name
       AND g.name = _game_name
       AND (_g2bulk_product_id IS NULL OR p.g2bulk_product_id = _g2bulk_product_id)
     LIMIT 1;
  ELSE
    SELECT s.price
      INTO v_price
      FROM (
        SELECT p.price, p.name, g.name AS game_name, p.g2bulk_product_id
          FROM public.packages p
          JOIN public.games g ON g.id = p.game_id
        UNION ALL
        SELECT sp.price, sp.name, g.name AS game_name, sp.g2bulk_product_id
          FROM public.special_packages sp
          JOIN public.games g ON g.id = sp.game_id
      ) s
     WHERE s.name = _package_name
       AND s.game_name = _game_name
       AND (_g2bulk_product_id IS NULL OR s.g2bulk_product_id = _g2bulk_product_id)
     LIMIT 1;
  END IF;

  RETURN v_price;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_order_amount_matches_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected numeric;
BEGIN
  v_expected := public.resolve_authoritative_order_price(
    TG_TABLE_NAME,
    NEW.game_name,
    NEW.package_name,
    NEW.g2bulk_product_id
  );

  IF v_expected IS NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = format(
        'Invalid package selection for game "%s" and package "%s"',
        NEW.game_name,
        NEW.package_name
      ),
      ERRCODE = '23514';
  END IF;

  IF abs(COALESCE(NEW.amount, 0) - v_expected) > 0.0001 THEN
    RAISE EXCEPTION USING
      MESSAGE = format(
        'Order amount mismatch: expected %.2f but received %.2f',
        v_expected,
        COALESCE(NEW.amount, 0)
      ),
      ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_topup_order_amount ON public.topup_orders;
CREATE TRIGGER trg_enforce_topup_order_amount
BEFORE INSERT OR UPDATE OF game_name, package_name, g2bulk_product_id, amount
ON public.topup_orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_order_amount_matches_catalog();

DROP TRIGGER IF EXISTS trg_enforce_preorder_order_amount ON public.preorder_orders;
CREATE TRIGGER trg_enforce_preorder_order_amount
BEFORE INSERT OR UPDATE OF game_name, package_name, g2bulk_product_id, amount
ON public.preorder_orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_order_amount_matches_catalog();

-- Prevent direct client-side order writes outside trusted server paths.
DROP POLICY IF EXISTS "Anyone can create orders" ON public.topup_orders;
CREATE POLICY "Service role can insert topup orders"
ON public.topup_orders
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can create preorder orders" ON public.preorder_orders;
CREATE POLICY "Service role can insert preorder orders"
ON public.preorder_orders
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
