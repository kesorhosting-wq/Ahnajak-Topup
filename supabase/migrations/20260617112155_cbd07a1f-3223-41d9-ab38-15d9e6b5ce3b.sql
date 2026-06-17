
-- 1. Attach handle_new_user trigger so future signups get a profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill missing profiles for existing auth users
INSERT INTO public.profiles (user_id, email, display_name, wallet_balance)
SELECT u.id, u.email,
       COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
       0
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. Fix point_exchange_configs admin policy to use has_role()
DROP POLICY IF EXISTS "Admins can manage exchange configs" ON public.point_exchange_configs;
CREATE POLICY "Admins can manage exchange configs"
  ON public.point_exchange_configs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
