
DROP POLICY IF EXISTS "Public assets are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Game images are publicly accessible" ON storage.objects;

-- has_role: needed by RLS policies for authenticated users; keep authenticated EXECUTE
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
