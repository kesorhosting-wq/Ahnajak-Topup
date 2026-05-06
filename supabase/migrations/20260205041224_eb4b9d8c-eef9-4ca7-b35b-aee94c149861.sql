-- Drop the insecure RLS policy that uses user_metadata (security vulnerability)
DROP POLICY IF EXISTS "Admin full access" ON public.topup_orders;
DROP POLICY IF EXISTS "User own orders only" ON public.topup_orders;

-- The existing policies "Users can view their own orders" and "Admins can view all orders" are correct
-- Just need to ensure they work properly

-- Let's also ensure we have policies for service role / internal operations
-- Create a policy for service role to update orders (for process-topup function)
CREATE POLICY "Service role can manage all orders"
  ON public.topup_orders
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');