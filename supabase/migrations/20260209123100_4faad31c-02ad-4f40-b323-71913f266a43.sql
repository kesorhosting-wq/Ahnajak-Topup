
-- Add quantity column to packages table
ALTER TABLE public.packages ADD COLUMN quantity integer DEFAULT NULL;

-- Add quantity column to special_packages table  
ALTER TABLE public.special_packages ADD COLUMN quantity integer DEFAULT NULL;
