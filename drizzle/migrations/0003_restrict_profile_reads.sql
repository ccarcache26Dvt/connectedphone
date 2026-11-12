DROP POLICY IF EXISTS "profiles readable by signed in" ON public.profiles;
CREATE POLICY "read own or chat partner profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.user_a = auth.uid() AND c.user_b = profiles.id)
       OR (c.user_b = auth.uid() AND c.user_a = profiles.id)
  )
);

CREATE OR REPLACE FUNCTION public.find_user_by_phone(_phone text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE auth.uid() IS NOT NULL AND phone = _phone LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.find_user_by_phone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_user_by_phone(text) TO authenticated;