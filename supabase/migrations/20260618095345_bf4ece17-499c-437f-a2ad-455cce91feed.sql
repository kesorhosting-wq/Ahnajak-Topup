-- Allow guest (anonymous) checkout: anyone may create an order row.
-- Server-side edge functions (process-topup, ahnajak-khqr, ikhode-payment)
-- run with the service role and validate price/package authoritatively,
-- so an INSERT from the client cannot forge prices.
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.topup_orders;
CREATE POLICY "Anyone can create orders"
  ON public.topup_orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

GRANT INSERT ON public.topup_orders TO anon;

-- Same fix for preorder_orders if its insert policy is also auth-only.
DROP POLICY IF EXISTS "Authenticated users can create preorder_orders" ON public.preorder_orders;
DROP POLICY IF EXISTS "Authenticated users can create preorders" ON public.preorder_orders;
CREATE POLICY "Anyone can create preorders"
  ON public.preorder_orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

GRANT INSERT ON public.preorder_orders TO anon;