-- Add default_package_icon column to games table
ALTER TABLE public.games
ADD COLUMN default_package_icon text DEFAULT NULL;