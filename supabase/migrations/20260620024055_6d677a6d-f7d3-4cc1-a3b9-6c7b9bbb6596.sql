
-- 1. Block users from modifying wallet_balance / reward_points on their own profile
CREATE OR REPLACE FUNCTION public.prevent_wallet_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (backend functions) to change anything
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'wallet_balance can only be modified by backend functions';
  END IF;
  IF NEW.reward_points IS DISTINCT FROM OLD.reward_points THEN
    RAISE EXCEPTION 'reward_points can only be modified by backend functions';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_wallet_self_update_trigger ON public.profiles;
CREATE TRIGGER prevent_wallet_self_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_wallet_self_update();

-- Tighten profile UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Lock wallet_transactions INSERT to service_role only
DROP POLICY IF EXISTS "Service role can insert wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Only service role can insert wallet transactions"
  ON public.wallet_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Revoke client INSERT on wallet_transactions
REVOKE INSERT ON public.wallet_transactions FROM anon, authenticated;

-- 3. Force client-inserted orders to status='pending'
DROP POLICY IF EXISTS "Anyone can create orders" ON public.topup_orders;
CREATE POLICY "Anyone can create pending orders"
  ON public.topup_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND g2bulk_order_id IS NULL
    AND card_codes IS NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can create preorders" ON public.preorder_orders;
DROP POLICY IF EXISTS "Authenticated users can create preorder orders" ON public.preorder_orders;
CREATE POLICY "Anyone can create pending preorders"
  ON public.preorder_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status IN ('pending', 'NOTPAID')
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 4. Belt-and-suspenders: block client UPDATE of orders to a paid-like status via trigger
CREATE OR REPLACE FUNCTION public.prevent_client_order_status_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Non-admin / non-service: cannot change status at all
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Order status can only be changed by backend or admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_topup_status_escalation ON public.topup_orders;
CREATE TRIGGER prevent_topup_status_escalation
  BEFORE UPDATE ON public.topup_orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_client_order_status_escalation();

DROP TRIGGER IF EXISTS prevent_preorder_status_escalation ON public.preorder_orders;
CREATE TRIGGER prevent_preorder_status_escalation
  BEFORE UPDATE ON public.preorder_orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_client_order_status_escalation();
