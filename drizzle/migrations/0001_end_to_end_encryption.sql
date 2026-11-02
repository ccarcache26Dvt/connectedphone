ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_key text;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.user_encryption_keys (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  encrypted_private_key text NOT NULL,
  encryption_salt text NOT NULL,
  encryption_iv text NOT NULL
);
GRANT SELECT, INSERT, UPDATE ON public.user_encryption_keys TO authenticated;
GRANT ALL ON public.user_encryption_keys TO service_role;
ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own encryption key" ON public.user_encryption_keys FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS encryption_version smallint NOT NULL DEFAULT 0;