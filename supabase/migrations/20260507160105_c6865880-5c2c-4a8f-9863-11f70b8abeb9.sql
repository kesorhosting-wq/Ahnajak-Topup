
-- 1. Lock storage buckets: prevent anonymous listing of all files in public buckets.
-- Files remain accessible by direct URL (still public-read), but listing/enumeration is blocked.
DROP POLICY IF EXISTS "Public read site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read game-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view game-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Allow admins full management on these two buckets
CREATE POLICY "Admins manage site-assets"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage game-images"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'game-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'game-images' AND public.has_role(auth.uid(), 'admin'));

-- 2. Revoke public EXECUTE on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.process_wallet_transaction(uuid, text, numeric, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_wallet_balance() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trigger_process_topup_on_paid() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_game_to_verification_config() FROM anon, authenticated, public;
