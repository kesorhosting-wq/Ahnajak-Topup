
-- Pre-order games table (admin selects which games to offer as pre-order)
CREATE TABLE public.preorder_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(game_id)
);

ALTER TABLE public.preorder_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active preorder games" ON public.preorder_games
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage preorder games" ON public.preorder_games
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Pre-order packages (like packages but with scheduled_fulfill_at)
CREATE TABLE public.preorder_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount text NOT NULL,
  price numeric NOT NULL,
  icon text,
  label text,
  label_bg_color text DEFAULT '#dc2626',
  label_text_color text DEFAULT '#ffffff',
  label_icon text,
  g2bulk_product_id text,
  g2bulk_type_id text,
  quantity integer,
  scheduled_fulfill_at timestamp with time zone,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.preorder_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view preorder packages" ON public.preorder_packages
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage preorder packages" ON public.preorder_packages
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Pre-order orders table
CREATE TABLE public.preorder_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  game_name text NOT NULL,
  package_name text NOT NULL,
  player_id text NOT NULL,
  server_id text,
  player_name text,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  payment_method text,
  g2bulk_order_id text,
  g2bulk_product_id text,
  card_codes jsonb,
  status text NOT NULL DEFAULT 'notpaid',
  status_message text,
  scheduled_fulfill_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.preorder_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all preorder orders" ON public.preorder_orders
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own preorder orders" ON public.preorder_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create preorder orders" ON public.preorder_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update preorder orders" ON public.preorder_orders
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage all preorder orders" ON public.preorder_orders
  FOR ALL USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Enable realtime for preorder orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.preorder_orders;

-- Updated_at triggers
CREATE TRIGGER update_preorder_games_updated_at BEFORE UPDATE ON public.preorder_games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preorder_packages_updated_at BEFORE UPDATE ON public.preorder_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preorder_orders_updated_at BEFORE UPDATE ON public.preorder_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
