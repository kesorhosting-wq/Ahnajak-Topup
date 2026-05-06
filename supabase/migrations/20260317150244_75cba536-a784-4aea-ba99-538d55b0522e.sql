
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS price_markup_percent numeric DEFAULT NULL;
ALTER TABLE public.special_packages ADD COLUMN IF NOT EXISTS price_markup_percent numeric DEFAULT NULL;
ALTER TABLE public.preorder_packages ADD COLUMN IF NOT EXISTS price_markup_percent numeric DEFAULT NULL;
