CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by signed in" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, display_name)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'phone', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read conv" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "members create conv" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (user_a, user_b));

CREATE OR REPLACE FUNCTION public.is_conv_member(_conv uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversations WHERE id = _conv AND auth.uid() IN (user_a, user_b));
$$;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text,
  attachment_path text,
  attachment_type text,
  attachment_name text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON public.messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read msgs" ON public.messages FOR SELECT TO authenticated USING (public.is_conv_member(conversation_id));
CREATE POLICY "members send msgs" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_conv_member(conversation_id));
CREATE POLICY "recipient marks read" ON public.messages FOR UPDATE TO authenticated USING (public.is_conv_member(conversation_id) AND sender_id <> auth.uid()) WITH CHECK (public.is_conv_member(conversation_id));

CREATE OR REPLACE FUNCTION public.bump_conversation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_message_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.bump_conversation();

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

CREATE POLICY "members read attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attachments' AND public.is_conv_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY "members upload attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments' AND public.is_conv_member(((storage.foldername(name))[1])::uuid));