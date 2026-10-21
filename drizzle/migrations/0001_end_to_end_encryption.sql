ALTER TABLE public.profiles
  ADD COLUMN public_key text;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

CREATE TABLE public.user_encryption_keys (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  encrypted_private_key text NOT NULL,
  encryption_salt text NOT NULL,
  encryption_iv text NOT NULL
);

ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.user_encryption_keys TO authenticated;
CREATE POLICY "users manage own encryption key"
  ON public.user_encryption_keys FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.messages
  ADD COLUMN encryption_version smallint NOT NULL DEFAULT 0;
