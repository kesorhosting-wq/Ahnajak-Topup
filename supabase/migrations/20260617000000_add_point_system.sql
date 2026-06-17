-- Enable extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add points to packages
ALTER TABLE packages ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE special_packages ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE preorder_packages ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- 2. Add reward_points to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0;

-- 3. Create point_exchange_configs table
CREATE TABLE IF NOT EXISTS point_exchange_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    exchange_type TEXT NOT NULL CHECK (exchange_type IN ('fixed', 'percent')),
    exchange_value NUMERIC NOT NULL,
    coupon_valid_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
    discount_value NUMERIC NOT NULL,
    is_used BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE
);

-- 5. Create point_transactions table
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'exchange', 'admin_adjust')),
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE point_exchange_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for point_exchange_configs
DROP POLICY IF EXISTS "Anyone can view active exchange configs" ON point_exchange_configs;
CREATE POLICY "Anyone can view active exchange configs" ON point_exchange_configs
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage exchange configs" ON point_exchange_configs;
CREATE POLICY "Admins can manage exchange configs" ON point_exchange_configs
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for coupons
DROP POLICY IF EXISTS "Users can view their own coupons" ON coupons;
CREATE POLICY "Users can view their own coupons" ON coupons
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all coupons" ON coupons;
CREATE POLICY "Admins can manage all coupons" ON coupons
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for point_transactions
DROP POLICY IF EXISTS "Users can view their own point transactions" ON point_transactions;
CREATE POLICY "Users can view their own point transactions" ON point_transactions
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all point transactions" ON point_transactions;
CREATE POLICY "Admins can manage all point transactions" ON point_transactions
    USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Grant Points Trigger Function
CREATE OR REPLACE FUNCTION grant_points_on_order_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_points INTEGER := 0;
    v_user_id UUID;
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Get points from standard packages
        SELECT points INTO v_points FROM packages 
        WHERE name = NEW.package_name AND game_id IN (SELECT id FROM games WHERE name = NEW.game_name) LIMIT 1;

        -- If not found, check special packages
        IF v_points IS NULL OR v_points = 0 THEN
            SELECT points INTO v_points FROM special_packages 
            WHERE name = NEW.package_name AND game_id IN (SELECT id FROM games WHERE name = NEW.game_name) LIMIT 1;
        END IF;

        IF v_points IS NULL OR v_points = 0 THEN
            SELECT points INTO v_points FROM preorder_packages 
            WHERE name = NEW.package_name AND game_id IN (SELECT id FROM games WHERE name = NEW.game_name) LIMIT 1;
        END IF;

        -- Grant points if found
        IF v_points > 0 AND NEW.user_id IS NOT NULL THEN
            UPDATE profiles SET reward_points = COALESCE(reward_points, 0) + v_points WHERE user_id = NEW.user_id;
            INSERT INTO point_transactions (user_id, amount, transaction_type, description, reference_id)
            VALUES (NEW.user_id, v_points, 'earn', 'Earned from ' || NEW.game_name || ' - ' || NEW.package_name, NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create Point Exchange Function
CREATE OR REPLACE FUNCTION exchange_points_for_coupon(config_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_points_req INTEGER;
    v_u_points INTEGER;
    v_type TEXT;
    v_val NUMERIC;
    v_days INTEGER;
    v_code TEXT;
BEGIN
    SELECT points_required, exchange_type, exchange_value, coupon_valid_days
    INTO v_points_req, v_type, v_val, v_days
    FROM point_exchange_configs WHERE id = config_id AND is_active = true;

    SELECT COALESCE(reward_points, 0) INTO v_u_points FROM profiles WHERE user_id = v_user_id;

    IF v_u_points < v_points_req THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient points');
    END IF;

    v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    INSERT INTO coupons (code, user_id, discount_type, discount_value, expires_at)
    VALUES (v_code, v_user_id, v_type, v_val, now() + (v_days || ' days')::interval);

    UPDATE profiles SET reward_points = reward_points - v_points_req WHERE user_id = v_user_id;
    INSERT INTO point_transactions (user_id, amount, transaction_type, description, reference_id)
    VALUES (v_user_id, -v_points_req, 'exchange', 'Exchanged for coupon ' || v_code, config_id);

    RETURN json_build_object('success', true, 'coupon_code', v_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add triggers
DROP TRIGGER IF EXISTS tr_grant_points_topup ON topup_orders;
CREATE TRIGGER tr_grant_points_topup AFTER UPDATE ON topup_orders FOR EACH ROW EXECUTE FUNCTION grant_points_on_order_completion();

DROP TRIGGER IF EXISTS tr_grant_points_preorder ON preorder_orders;
CREATE TRIGGER tr_grant_points_preorder AFTER UPDATE ON preorder_orders FOR EACH ROW EXECUTE FUNCTION grant_points_on_order_completion();

-- 9. Create function to validate and use coupon
CREATE OR REPLACE FUNCTION apply_coupon(p_code TEXT, p_order_amount NUMERIC)
RETURNS JSON AS $$
DECLARE
    v_coupon RECORD;
    v_discount_amount NUMERIC := 0;
BEGIN
    -- Find the coupon
    SELECT * INTO v_coupon FROM coupons 
    WHERE code = p_code AND user_id = auth.uid() AND is_used = false AND expires_at > now();

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Invalid, expired, or already used coupon');
    END IF;

    -- Calculate discount
    IF v_coupon.discount_type = 'fixed' THEN
        v_discount_amount := v_coupon.discount_value;
    ELSIF v_coupon.discount_type = 'percent' THEN
        v_discount_amount := (p_order_amount * v_coupon.discount_value / 100);
    END IF;

    -- Ensure discount isn't more than the order
    IF v_discount_amount > p_order_amount THEN
        v_discount_amount := p_order_amount;
    END IF;

    -- Mark coupon as used
    UPDATE coupons SET is_used = true, used_at = now() WHERE id = v_coupon.id;

    RETURN json_build_object('success', true, 'discount_amount', v_discount_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
